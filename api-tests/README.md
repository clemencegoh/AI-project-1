# API Testing Files

**AI-Assisted Development**

This directory contains REST client files for testing the Aetheric Engine TCP Client API endpoints.

## Files Overview

### 1. `main.rest`
Basic API endpoints for the main application:
- Health check
- Start message collection
- Get collection status
- Stop collection (if implemented)

### 2. `validation.rest`
Validation service endpoints:
- Validate ASCII messages
- Validate binary messages
- Get validation summary
- Get full validation report

### 3. `workflow.rest`
Complete end-to-end workflow demonstrating the entire message collection process:
- Step-by-step guide from health check to validation
- Detailed comments explaining each step
- Recommended order of operations

## How to Use

### Prerequisites
1. Ensure the application is running on `http://localhost:3000`
2. Have a REST client installed (VS Code REST Client extension, Postman, etc.)

### Using VS Code REST Client Extension
1. Install the "REST Client" extension by Huachao Mao
2. Open any `.rest` file
3. Click "Send Request" above each HTTP request
4. View responses in the adjacent panel

### Recommended Workflow
1. Start with `workflow.rest` for the complete process
2. Use `main.rest` for basic operations
3. Use `validation.rest` after message collection is complete

## Expected Responses

### Health Check
```json
"Aetheric Engine TCP Client - Ready to collect messages!"
```

### Start Collection
```json
{
  "message": "Message collection started successfully"
}
```

### Collection Status
```json
{
  "isRunning": true,
  "totalMessages": 150,
  "asciiMessages": 75,
  "binaryMessages": 75,
  "targetMessages": 600,
  "errors": []
}
```

### Validation Summary
```json
{
  "ascii": {
    "isValid": true,
    "totalCount": 300,
    "validCount": 300,
    "invalidCount": 0,
    "errors": [],
    "warnings": []
  },
  "binary": {
    "isValid": true,
    "totalCount": 300,
    "validCount": 300,
    "invalidCount": 0,
    "errors": [],
    "warnings": []
  },
  "overall": {
    "totalMessages": 600,
    "totalValid": 600,
    "totalInvalid": 0,
    "validationPassed": true
  }
}
```

## Tips

1. **Monitor Progress**: Use the status endpoint repeatedly to watch message collection progress
2. **Wait for Completion**: Don't run validation until collection is complete (isRunning: false)
3. **Check Errors**: Always check the errors array in status responses
4. **Validation**: Run validation endpoints to verify message parsing correctness

## Troubleshooting

- **Connection Refused**: Ensure the application is running on port 3000
- **Collection Not Starting**: Check JWT token validity and server connectivity
- **No Messages**: Verify the Aetheric Engine server is accessible
- **Database Errors**: Check Neon PostgreSQL connection in application logs
