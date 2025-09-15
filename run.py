import uvicorn
from app.main import app

if __name__ == "__main__":
    print("🚀 Excel Import Tizimi ishga tushirilmoqda...")
    print("📊 Web interface: http://localhost:8000")
    print("📖 API docs: http://localhost:8000/docs")
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )