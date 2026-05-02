import uvicorn


def main():
    print("Starting NetLanding API server at http://127.0.0.1:8000")
    print("API docs available at http://127.0.0.1:8000/docs")
    uvicorn.run("netlanding.main:app", host="127.0.0.1", port=8000, reload=False)


if __name__ == "__main__":
    main()
