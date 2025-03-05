# main.py
import os
import json
import queue
import asyncio
import threading
from functools import partial

import numpy as np
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

import tritonclient.grpc as grpcclient
from tritonclient.utils import InferenceServerException, np_to_triton_dtype
from transformers import AutoTokenizer

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3000/ws",
        "https://zelime.duckdns.org",
        "https://zelime.duckdns.org/ws/infer",
        "https://zelime.duckdns.org/ws",
        "localhost:3000/ws",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

TOKENIZER_PATH = '/engines/Llama-Krikri-8B-Instruct/'

try:
    tokenizer = AutoTokenizer.from_pretrained(TOKENIZER_PATH)
    print("Tokenizer loaded successfully.")
except Exception as e:
    print(f"Failed to load tokenizer: {e}")
    exit(1)


def prepare_tensor(name, input_array):
    t = grpcclient.InferInput(name, input_array.shape, np_to_triton_dtype(input_array.dtype))
    t.set_data_from_numpy(input_array)
    return t

class UserData:
    def __init__(self):
        self._completed_requests = queue.Queue()
        self.conversation_history = [
            {
                "role": "system",
                "content": "Eisai o Mastoras, o prosopikos voithos tou Chris. Help him anywhere you can!"
            }
        ]
        self.response_tokens = []

def ws_callback(user_data, result, error):
    if error:
        user_data._completed_requests.put("Error: " + str(error))
    else:
        token = result.as_numpy('text_output')[0].decode("utf-8")
        user_data.response_tokens.append(token)
        user_data._completed_requests.put(token)

def blocking_inference(payload, user_data):
    client = grpcclient.InferenceServerClient(url="trt2501_krikri:8001")
    
    max_tokens_val = payload.get("max_tokens", 4196)
    temperature_val = payload.get("temperature", 0.4)
    top_k_val = payload.get("top_k", 40)
    top_p_val = payload.get("top_p", 0.9)
    repetition_penalty_val = payload.get("repetition_penalty", 1.0)
    frequency_penalty_val = payload.get("frequency_penalty", 0.0)
    presence_penalty_val = payload.get("presence_penalty", 0.0)
    
    prompt = tokenizer.apply_chat_template(user_data.conversation_history, add_generation_prompt=True, tokenize=False)
    
    text_input = np.array([[prompt]], dtype=object)
    max_tokens = np.ones_like(text_input).astype(np.int32) * int(max_tokens_val)
    stream = np.array([[True]], dtype=bool)
    beam_width = np.array([[1]], dtype=np.int32)
    temperature = np.array([[temperature_val]], dtype=np.float32)
    top_k = np.array([[top_k_val]], dtype=np.int32)
    top_p = np.array([[top_p_val]], dtype=np.float32)
    repetition_penalty = np.array([[repetition_penalty_val]], dtype=np.float32)
    frequency_penalty = np.array([[frequency_penalty_val]], dtype=np.float32)
    presence_penalty = np.array([[presence_penalty_val]], dtype=np.float32)
    
    inputs = [
        prepare_tensor("text_input", text_input),
        prepare_tensor("max_tokens", max_tokens),
        prepare_tensor("stream", stream),
        prepare_tensor("beam_width", beam_width),
        prepare_tensor("temperature", temperature),
        prepare_tensor("top_k", top_k),
        prepare_tensor("top_p", top_p),
        prepare_tensor("repetition_penalty", repetition_penalty),
        prepare_tensor("frequency_penalty", frequency_penalty),
        prepare_tensor("presence_penalty", presence_penalty),
    ]
    
    outputs = [grpcclient.InferRequestedOutput("text_output")]
    
    client.start_stream(callback=partial(ws_callback, user_data))
    client.async_stream_infer("ensemble", inputs, outputs=outputs, request_id="")
    client.stop_stream()

@app.websocket("/ws")
async def websocket_infer(websocket: WebSocket):
    await websocket.accept()
    user_data = UserData()
    try:
        while True:
            data = await websocket.receive_text()
            try:
                payload = json.loads(data)
            except Exception:
                payload = {"prompt": data}
            user_message = payload.get("prompt", data)
            user_data.conversation_history.append({"role": "user", "content": user_message})
            user_data.response_tokens = []
            
            thread = threading.Thread(target=blocking_inference, args=(payload, user_data))
            thread.start()
            
            while thread.is_alive() or not user_data._completed_requests.empty():
                try:
                    token = user_data._completed_requests.get(timeout=0.1)
                    if isinstance(token, InferenceServerException) or isinstance(token, Exception):
                        await websocket.send_text("Error: " + str(token))
                    else:
                        await websocket.send_text(token)
                except queue.Empty:
                    await asyncio.sleep(0.1)
            full_response = "".join(user_data.response_tokens)
            user_data.conversation_history.append({"role": "assistant", "content": full_response})
    except WebSocketDisconnect:
        print("WebSocket disconnected")
    except Exception as e:
        await websocket.send_text("Error: " + str(e))
        await websocket.close()

@app.post("/infer")
async def infer_endpoint(data: dict):
    prompt = data.get("prompt")
    messages = [ 
        {"role": "system", "content": "Eisai o Mastoras, o prosopikos voithos tou Chris. Help him anywhere you can!"},
        {"role": "user", "content": prompt}
    ]
    data["prompt"] = tokenizer.apply_chat_template(messages, add_generation_prompt=True, tokenize=False)
    
    user_data = UserData()
    thread = threading.Thread(target=blocking_inference, args=(data, user_data))
    thread.start()
    thread.join()
    tokens = []
    while not user_data._completed_requests.empty():
        tokens.append(user_data._completed_requests.get())
    full_text = "".join([t if not isinstance(t, Exception) else "" for t in tokens])
    return JSONResponse({"output": full_text})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=7000, reload=True)
