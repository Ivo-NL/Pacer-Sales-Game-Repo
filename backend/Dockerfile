FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose the port the app runs on
EXPOSE 8001

# Make sure the proper structure exists
RUN echo "Making sure directories exist and structure is correct"
RUN ls -la

# Command to run the application
CMD ["python", "run.py"] 