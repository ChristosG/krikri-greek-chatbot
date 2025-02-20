
---

# Krikri LLM Guide

This guide explains how to set up and run the Krikri LLM system using NVIDIA Triton Server with Docker. It covers prerequisites, building the container images, model quantization, engine building, and launching the services.

## Overview

The system is composed of three main Docker services:

- **krikri_trt**: Runs the Triton server with your models.
- **backend_api**: A FastAPI backend serving the inference API.
- **next_app**: A Next.js app providing a chat interface.

The setup leverages Docker Compose to streamline the process, automatically downloading and configuring all components.

## Prerequisites

- **NVIDIA Drivers**:  
  Make sure your system has the required NVIDIA drivers installed. On Linux, the easiest method is to use “Additional Drivers” in your settings and select the desired version.
  
- **NVIDIA Container Toolkit**:  
  Install the NVIDIA Container Toolkit. For Ubuntu, search for “install NVIDIA container toolkit Ubuntu” to find the installation guide.

- **Docker & Docker Compose**:  
  Ensure you have Docker and Docker Compose installed.

## Docker Compose Setup

The `docker-compose.yml` file contains three services. Here’s the configuration for reference:

```yaml
services:
  krikri_trt:
    build:
      context: .
      dockerfile: Dockerfile.krikri_trt  
    container_name: trt2501_krikri
    command: >
      tritonserver --model-repository=/krikri/ 
      --model-control-mode=explicit 
      --load-model=preprocessing 
      --load-model=postprocessing 
      --load-model=ensemble 
      --http-port=8000 
      --grpc-port=8001
      --metrics-port=8002
    ports:
      - "8000:8000"
      - "8001:8001"
      - "8002:8002"
    volumes:
      - /mnt/nvme512/engines:/engines
      - /home/chris/krikri/krikri/:/krikri
    environment:
      NVIDIA_DRIVER_CAPABILITIES: compute,utility
      NVIDIA_VISIBLE_DEVICES: 0
    runtime: nvidia
    ulimits:
      memlock:
        soft: -1
        hard: -1
      stack: 67108864
    security_opt:
      - label=disable
      - seccomp=unconfined
    tmpfs:
      - /tmp:exec
    user: root
    ipc: host

  backend_api:
    build:
      context: .
      dockerfile: ./Dockerfile.backend
    container_name: fastapi_backend
    command: gunicorn -k uvicorn.workers.UvicornWorker grpc_stream:app --bind 0.0.0.0:7000 --workers 4
    ports:
      - "7000:7000"
    volumes:
      - ./:/app
      - /mnt/nvme512/engines:/engines
    depends_on:
       - krikri_trt
    environment:
      - TRITON_SERVER_URL_4060=krikri_trt:8000
    privileged: true
    extra_hosts:
      - "host.docker.internal:host-gateway"

  next_app:
    build:
      context: ./chatbot-ui
      dockerfile: ../Dockerfile.next
    container_name: next_app
    ports:
      - "3000:3000"
    volumes:
      - ./chatbot-ui:/app
```

## Model Preparation

### 1. Build the Triton Server Container

First, you need to build and run the Triton container using the provided `Dockerfile.krikri_trt`:

```dockerfile
FROM nvcr.io/nvidia/tritonserver:25.01-trtllm-python-py3

RUN git clone https://github.com/NVIDIA/TensorRT-LLM.git

EXPOSE 8000
EXPOSE 8001
EXPOSE 8002

CMD ["/bin/bash"]
```

### 2. Clone the Llama-Krikri-8B-Instruct Model

Clone the model from Hugging Face:

```bash
git clone https://huggingface.co/ilsp/Llama-Krikri-8B-Instruct.git
```

Attach the cloned directory to your desired location (in this guide, we assume it is stored in `/mnt/nvme512/engines`).

### 3. Quantize the Model

After cloning the model, run the quantization process. First, ensure your script is executable:

```bash
chmod +x script.sh
```

Then, run the container to start the quantization process:

```bash
docker run --rm -it --net host --ulimit memlock=-1 --ulimit stack=67108864 \
    --security-opt=label=disable --security-opt seccomp=unconfined \
    --tmpfs /tmp:exec --user root \
    --gpus "device=all" \
    --ipc=host \
    -p8000:8000 -p8001:8001 -p8002:8002 \
    --name trtllm_2501 \
    -v /mnt/nvme512/engines:/engines \
    tritontrt2501 /bin/bash
```

Inside the container, verify that the `TensorRT-LLM` directory exists. Then, execute the quantization commands.

#### Option 1: FP8 Quantization (High VRAM Requirement)
```bash
python TensorRT-LLM/examples/quantization/quantize.py --model_dir /engines/Llama-Krikri-8B-Instruct   \
                        --output_dir /engines/krikri_ckpt \
                        --dtype float16  \
                        --qformat fp8 \
                        --kv_cache_dtype fp8 \
                        --tp_size 1
```
> **Note**: This approach requires VRAM almost equal to the model size. It can also run on CPU (with around 32GB RAM) but may take roughly 5 hours.

#### Option 2: INT4 Quantization (Faster, Lower Precision)
```bash
python TensorRT-LLM/examples/llama/convert_checkpoint.py --model_dir /engines/Llama-Krikri-8B-Instruct  \
                        --output_dir /engines/krikri_ckpt \
                        --dtype float16 \
                        --use_weight_only \
                        --weight_only_precision int4 \
                        --int8_kv_cache 
```

### 4. Build the TensorRT-LLM Engine

Once the checkpoint is ready (e.g., saved in `/mnt/nvme512/engines`), build the engine:

```bash
trtllm-build --checkpoint_dir /engines/krikri_ckpt \
             --output_dir /engines/krikri_engine \
             --use_paged_context_fmha enable \
             --use_fp8_context_fmha enable \
             --max_seq_len 64000 --max_batch_size 4 \
             --log_level info \
             --multiple_profiles enable \
             --use_fused_mlp enable \
             --reduce_fusion enable --user_buffer enable 
```
> **Tip**: Start with `--max_seq_len 4096` to check your GPU’s capacity. The model supports a 128k context window, but higher sequence lengths require more VRAM.

## Running the Services

After successfully building the engine, you can launch all services:

```bash
docker-compose up --build
```

Once the services are up, open your browser and navigate to [http://localhost:3000](http://localhost:3000) to chat with Krikri.

## TODO

- **Memory Context**:  
  Currently, every question is treated as standalone without maintaining previous conversation context. Future updates will include session memory to track conversation history.

---

