# Wealthfolio Backend

A Node.js/Express backend API for the Wealthfolio web application.

## Features

- **Authentication**: JWT-based authentication with refresh tokens
- **User Management**: Multi-user support with user-specific data isolation
- **Portfolio Management**: Accounts, activities, assets, and portfolio tracking
- **Market Data**: Asset quotes and market data management
- **Goals & Limits**: Investment goals and contribution limits
- **Security**: Rate limiting, CORS, input validation, and secure headers

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL (production) / SQLite (development)
- **ORM**: Knex.js
- **Authentication**: JWT with bcrypt
- **Validation**: Zod
- **Security**: Helmet, CORS, rate limiting

## Quick Start

1. **Install dependencies**:
```bash
npm install
```

2. **Set up environment variables**:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Run database migrations**:
```bash
npm run db:migrate
```

4. **Start development server**:
```bash
npm run dev
```

The API will be available at `http://localhost:3000/api/v1`

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login user
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - Logout user
- `GET /api/v1/auth/me` - Get current user

### Accounts
- `GET /api/v1/accounts` - Get user accounts
- `GET /api/v1/accounts/summary` - Get accounts summary
- `GET /api/v1/accounts/:id` - Get specific account
- `POST /api/v1/accounts` - Create new account
- `PUT /api/v1/accounts/:id` - Update account
- `DELETE /api/v1/accounts/:id` - Delete account

### Activities
- `GET /api/v1/activities` - Get activities (with filters)
- `GET /api/v1/activities/types` - Get activity types
- `GET /api/v1/activities/:id` - Get specific activity
- `POST /api/v1/activities` - Create new activity
- `POST /api/v1/activities/import` - Bulk import activities
- `PUT /api/v1/activities/:id` - Update activity
- `DELETE /api/v1/activities/:id` - Delete activity

### Assets
- `GET /api/v1/assets` - Get assets (with filters)
- `GET /api/v1/assets/search` - Search assets
- `GET /api/v1/assets/types` - Get asset types
- `GET /api/v1/assets/data-sources` - Get data sources
- `GET /api/v1/assets/:id` - Get specific asset
- `GET /api/v1/assets/:id/history` - Get asset price history
- `GET /api/v1/assets/:id/activities` - Get asset activities
- `PUT /api/v1/assets/:id` - Update asset
- `PUT /api/v1/assets/:id/data-source` - Update asset data source

## Database Schema

The database includes the following main tables:

- `users` - User accounts
- `user_sessions` - JWT refresh token sessions
- `user_settings` - User preferences
- `accounts` - Investment accounts
- `assets` - Financial instruments
- `activities` - Investment transactions
- `quotes` - Market data/price quotes
- `goals` - Investment goals
- `contribution_limits` - Contribution limits tracking

## Development

### Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run test` - Run tests
- `npm run lint` - Run ESLint
- `npm run db:migrate` - Run database migrations
- `npm run db:rollback` - Rollback last migration

### Environment Variables

Required environment variables:

- `DATABASE_URL` - PostgreSQL connection string (production)
- `DATABASE_URL_DEV` - SQLite file path (development)
- `JWT_SECRET` - JWT signing secret (min 32 chars)
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)

Optional:

- `CORS_ORIGIN` - Allowed CORS origins
- `RATE_LIMIT_WINDOW_MS` - Rate limit window
- `RATE_LIMIT_MAX_REQUESTS` - Max requests per window
- `LOG_LEVEL` - Logging level
- `LOG_FILE` - Log file path

## Deployment

1. Set up PostgreSQL database
2. Configure environment variables
3. Run database migrations
4. Build and start the application:

```bash
npm run build
npm start
```

## Security Features

- JWT authentication with refresh tokens
- Password hashing with bcrypt
- Rate limiting on API endpoints
- CORS configuration
- Input validation with Zod
- Secure HTTP headers with Helmet
- SQL injection prevention with parameterized queries

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request