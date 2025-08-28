# Aetheric Engine TCP Client

**AI-Assisted Development**

A NestJS-based TCP client application that connects to the Aetheric Engine server to collect and store ASCII and binary messages in a PostgreSQL database using Prisma ORM.

## Features

- **TCP Client**: Connects to the Aetheric Engine server and authenticates using JWT
- **Message Processing**: Parses both ASCII and binary messages according to the protocol specification
- **Database Storage**: Stores messages in PostgreSQL using Prisma ORM
- **Validation Service**: Independent validation app to verify message parsing correctness
- **Docker Support**: Fully containerized application with Docker Compose
- **Real-time Status**: Monitor collection progress and statistics

## Architecture

- **NestJS**: Backend framework with modular architecture
- **PostgreSQL**: Database for storing messages
- **Prisma**: ORM for database operations
- **Docker**: Containerization for easy deployment

## Protocol Specification

### ASCII Messages
- Format: `$<payload>;`
- Payload: 5+ printable ASCII characters (excluding `$` and `;`)
- Example: `$Hello123;`

### Binary Messages
- Header: `0xAA` (1 byte)
- Size: 5 bytes (big-endian, payload size)
- Payload: Variable length binary data

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for local development)

### Using Docker (Recommended)

1. **Clone and navigate to the project**:
   ```bash
   cd /path/to/aetheric-engine-client
   ```

2. **Start the application**: No longer relevant
   - Ignore the below since this is only relevant for postgres and we're now using sqlite
   ```bash
   docker-compose up -d
   ```

3. **Initialize the database**:
   ```bash
   docker-compose exec app npx prisma migrate deploy
   ```

4. **Start message collection**:
   ```bash
   curl -X POST http://localhost:3000/start-collection
   ```

5. **Monitor progress**:
   ```bash
   curl http://localhost:3000/status
   ```

### Local Development

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start PostgreSQL**:
   ```bash
   docker-compose up postgres -d
   ```

3. **Run database migrations**:
   ```bash
   npm run prisma:migrate
   ```

4. **Generate Prisma client**:
   ```bash
   npm run prisma:generate
   ```

5. **Start the application**:
   ```bash
   npm run start:dev
   ```

## API Endpoints

### Main Application
- `GET /` - Health check
- `POST /start-collection` - Start message collection
- `GET /status` - Get collection status

### Validation Service
- `GET /validation/ascii` - Validate ASCII messages
- `GET /validation/binary` - Validate binary messages
- `GET /validation/summary` - Get validation summary
- `GET /validation/full-report` - Get detailed validation report

## Configuration

Environment variables are configured in `.env` file. Copy `.env.example` to `.env` and update with your values:

```bash
cp .env.example .env
```

Required environment variables:

```env
DATABASE_URL="database_url_here"
AE_SERVER_HOST="35.213.160.152"
AE_SERVER_PORT="8080"
JWT_TOKEN="your_jwt_token_here"
```

**Database**: The application is configured to use Neon PostgreSQL (cloud database) instead of local PostgreSQL. This eliminates the need to run a local database instance.

**Security Note**: The `.env` file contains sensitive information and should never be committed to version control. Always use `.env.example` as a template.

## Database Schema

### msgascii Table
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| payload | TEXT | ASCII message payload |
| createdAt | TIMESTAMP | Creation timestamp |

### msgbinary Table
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| payload | BYTEA | Binary message payload |
| createdAt | TIMESTAMP | Creation timestamp |

## Message Collection Process

1. **Authentication**: Sends `AUTH <JWT_TOKEN>` to the server
2. **Message Reception**: Continuously receives and buffers TCP data
3. **Message Parsing**: Identifies and extracts ASCII and binary messages
4. **Database Storage**: Immediately stores parsed messages
5. **Completion**: Stops after collecting 600+ messages
6. **Cleanup**: Sends `STATUS` command and drains TCP connection

## Validation Features

The validation service provides comprehensive verification:

- **ASCII Message Validation**:
  - Minimum 5 characters
  - Only printable ASCII characters
  - No forbidden characters (`$`, `;`)

- **Binary Message Validation**:
  - Non-empty payloads
  - Size limit checks
  - Large message warnings

- **Statistics**:
  - Message counts and sizes
  - Validation success rates
  - Sample message inspection

## Development Notes

- **AI-Assisted**: This project was developed with AI assistance
- **Error Handling**: Robust error handling for network and database operations
- **Logging**: Comprehensive logging for debugging and monitoring
- **Buffer Management**: Efficient TCP buffer processing for message boundaries
- **Large Message Support**: Handles messages up to gigabyte sizes

## Troubleshooting

### Common Issues

1. **Connection Refused**:
   - Verify server IP and port
   - Check JWT token validity
   - Ensure network connectivity

2. **Database Connection**:
   - Verify PostgreSQL is running
   - Check DATABASE_URL configuration
   - Run database migrations

3. **Message Parsing**:
   - Use validation endpoints to verify parsing
   - Check logs for parsing errors
   - Inspect raw TCP data if needed

### Useful Commands

```bash
# View logs
docker-compose logs app

# Access database
docker-compose exec postgres psql -U postgres -d aetheric_engine

# Reset database
docker-compose down -v
docker-compose up -d

# Run validation
curl http://localhost:3000/validation/summary
```

## License

MIT License - This project is for educational and demonstration purposes.
