from fastapi import FastAPI
import uvicorn

app = FastAPI(title="PACER API", description="PACER Sales Methodology Game API")

@app.get("/api/health")
async def health_check():
    return {"status": "ok"}

@app.get("/api")
async def root():
    return {"message": "Welcome to PACER Sales Methodology Game API!"}

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8001, reload=True) 