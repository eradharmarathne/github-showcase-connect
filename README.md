# CheckingCheckout - Multi-Tenant Hospitality ERP System

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](https://github.com/kalanakt/app.checkingcheckout.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-2.0-green.svg)](https://supabase.com/)
[![License](https://img.shields.io/badge/license-Private-red.svg)](LICENSE)


A comprehensive multi-tenant hospitality management system built for hotels, guesthouses, and accommodation providers. Manage reservations, track income/expenses, generate reports, and integrate with major booking channels - all from one centralized platform.

## 🏨 Features

### 🎯 Core Management
- **Reservation Management** - Complete booking lifecycle with guest details, payments, and commissions
- **Multi-Location Support** - Manage multiple properties from a single account
- **Room Inventory** - Pricing, amenities, availability management
- **Financial Tracking** - Income/expense management with detailed reporting
- **User Management** - Role-based access control with granular permissions

### 📊 Business Intelligence
- **Financial Reports** - Revenue, expenses, profit/loss statements
- **Occupancy Analytics** - Room utilization and booking patterns
- **Performance Dashboards** - Real-time KPIs and metrics
- **Custom Reports** - Flexible reporting with date ranges and filters

### 🔌 Integrations
- **Booking Channels** - Beds24, Airbnb, Booking.com integration
- **Payment Processing** - Multiple payment method support
- **SMS Notifications** - Automated guest communications via Hutch API
- **Calendar Sync** - iCal and external calendar synchronization

### 🏢 Multi-Tenancy
- **Complete Tenant Isolation** - Secure data separation
- **Subscription Management** - SaaS billing with Polar.sh integration
- **Team Collaboration** - Invitation system with role-based permissions
- **Trial Periods** - Free trials with automatic subscription management

## 🚀 Technology Stack

### Frontend
- **React 18** - Modern React with hooks and context
- **TypeScript** - Full type safety throughout the application
- **Vite** - Fast development and build tooling
- **TailwindCSS** - Utility-first CSS framework
- **shadcn/ui** - High-quality UI components
- **TanStack Query** - Powerful data fetching and caching
- **React Router v7** - Client-side routing with nested routes

### Backend
- **Supabase** - PostgreSQL database with real-time subscriptions
- **Row Level Security (RLS)** - Database-level security policies
- **Edge Functions** - Serverless functions for integrations
- **Authentication** - Built-in auth with invitation system
- **Real-time** - Live updates across the application

### Infrastructure
- **Vercel** - Deployment and hosting
- **PostgreSQL** - Primary database with 30+ tables
- **Resend** - Email delivery service
- **Hutch SMS** - SMS notification service

## 📁 Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── ui/              # shadcn/ui components
│   ├── master-files/    # Domain-specific components
│   └── reports/         # Report components
├── context/             # React context providers
│   ├── AuthContext.tsx  # Authentication state
│   └── LocationContext.tsx # Location switching
├── hooks/               # Custom React hooks
├── pages/               # Route components
├── lib/                 # Utility functions and types
├── integrations/        # External service integrations
│   └── supabase/       # Supabase client and types
└── utils/               # Helper utilities

supabase/
├── migrations/          # Database schema migrations
├── functions/           # Edge functions
│   ├── send-user-credentials/
│   ├── fetch-beds24-bookings/
│   └── sync-ical/
└── config.toml         # Supabase configuration
```

## 🏗️ Database Architecture

### Core Tables
- **tenants** - Multi-tenant organization management
- **profiles** - User accounts with role-based access
- **user_permissions** - Granular permission matrix
- **locations** - Property/location management
- **rooms** - Room inventory and pricing
- **reservations** - Complete booking lifecycle
- **income/expenses** - Financial transaction tracking

### Security
- **Row Level Security (RLS)** - All tables secured with tenant isolation
- **SECURITY DEFINER Functions** - Secure operations with elevated privileges
- **Audit Trails** - Change tracking across critical operations

### Performance
- **Optimized Indexes** - Query performance optimization
- **Connection Pooling** - Efficient database connections
- **Real-time Subscriptions** - Live data updates

## 🛠️ Development Setup

### Prerequisites
- **Node.js 18+** - JavaScript runtime
- **Bun** - Fast JavaScript package manager and runtime
- **Supabase CLI** - Database management and Edge Functions
- **Git** - Version control

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/kalanakt/app.checkingcheckout.com.git
   cd app.checkingcheckout.com
   ```

2. **Install dependencies**
   ```bash
   bun install
   ```

3. **Environment setup**
   ```bash
   cp .env.example .env.local
   # Configure your environment variables
   ```

4. **Database setup**
   ```bash
   # Start Supabase locally
   supabase start
   
   # Push migrations
   supabase db push
   
   # Deploy Edge Functions
   supabase functions deploy
   ```

5. **Start development server**
   ```bash
   bun dev
   ```

### Environment Variables

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Email Service
RESEND_API_KEY=your_resend_api_key

# SMS Service
HUTCH_SMS_TOKEN=your_hutch_sms_token

# Billing Integration (Polar.sh)
VITE_POLAR_ORGANIZATION_ID=your_polar_organization_id
```

## 🔧 Available Scripts

```bash
# Development
bun dev                 # Start development server
bun build              # Production build
bun build:dev          # Development build
bun preview            # Preview production build

# Code Quality
bun lint               # Run linter
bun format             # Format code
bun check              # Run all checks

# Database
supabase start         # Start local Supabase
supabase stop          # Stop local Supabase
supabase db push       # Push migrations
supabase functions deploy # Deploy Edge Functions
supabase gen types typescript --local # Generate types
```

## 🏗️ Multi-Tenant Architecture

### Tenant Isolation
- **Database Level**: All tables include `tenant_id` for complete data isolation
- **Application Level**: Context-aware components and hooks
- **Permission Level**: Granular access control per tenant/location

### User Roles
- **Tenant Admin** - Full access to tenant resources
- **Tenant Manager** - Limited administrative access
- **Tenant Staff** - Operational access based on permissions
- **Location-specific** - Permissions can be scoped to specific locations

### Subscription Management
- **Trial Periods** - Automatic trial management
- **Plan Upgrades** - Seamless subscription upgrades
- **Usage Tracking** - Monitor feature usage and limits
- **Billing Integration** - Automated billing with Polar.sh

## 🔐 Security Features

### Authentication
- **Email/Password** - Traditional authentication
- **Invitation System** - Secure team member onboarding
- **Session Management** - Automatic session refresh
- **Password Recovery** - Secure password reset flow

### Authorization
- **Row Level Security** - Database-level access control
- **Role-Based Access** - Hierarchical permission system
- **Feature Permissions** - Granular feature access control
- **Multi-Location** - Location-scoped permissions

### Data Protection
- **Encryption** - Data encrypted at rest and in transit
- **Audit Logs** - Comprehensive activity logging
- **Backup Strategy** - Automated database backups
- **Compliance** - GDPR and data protection compliance

## 📡 API Integration

### Booking Channels
- **Beds24** - Property management system integration
- **Channel Manager** - Multi-channel booking synchronization
- **iCal Sync** - External calendar integration
- **Real-time Updates** - Live booking synchronization

### Communication
- **Email Notifications** - Automated guest and staff emails
- **SMS Alerts** - Payment and booking notifications
- **Template System** - Customizable message templates
- **Multi-language** - Localized communications

### Payment Processing
- **Multiple Methods** - Credit cards, bank transfers, cash
- **Commission Tracking** - Channel commission management
- **Payment Reconciliation** - Automated payment matching
- **Financial Reporting** - Comprehensive payment analytics

## 🚀 Deployment

### Production Deployment
1. **Build the application**
   ```bash
   bun run build
   ```

2. **Deploy to Vercel**
   ```bash
   vercel deploy --prod
   ```

3. **Deploy Supabase functions**
   ```bash
   supabase functions deploy
   ```

### Environment Configuration
- **Production Database** - Supabase hosted PostgreSQL
- **Edge Functions** - Deployed to Supabase Edge Runtime
- **CDN** - Static assets served via Vercel CDN
- **Monitoring** - Application performance monitoring

## 📊 Performance

### Optimization Features
- **Code Splitting** - Dynamic imports for optimal loading
- **Image Optimization** - Automatic image compression and formatting
- **Caching Strategy** - Intelligent caching with TanStack Query
- **Bundle Analysis** - Regular bundle size monitoring

### Monitoring
- **Error Tracking** - Comprehensive error monitoring
- **Performance Metrics** - Core Web Vitals tracking
- **User Analytics** - Usage pattern analysis
- **Database Monitoring** - Query performance optimization

## 🤝 Contributing

### Development Workflow
1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Commit changes** (`git commit -m 'Add amazing feature'`)
4. **Push to branch** (`git push origin feature/amazing-feature`)
5. **Open a Pull Request**

### Code Standards
- **TypeScript** - Strict type checking required
- **ESLint/Prettier** - Code formatting and linting
- **Conventional Commits** - Standardized commit messages
- **Testing** - Comprehensive test coverage

### Database Changes
- **Migrations** - All schema changes via migrations
- **RLS Policies** - Security policies for new tables
- **Type Generation** - Update TypeScript types after schema changes
- **Documentation** - Update schema documentation

## 📄 License

This project is proprietary software. All rights reserved.

## 🆘 Support

### Documentation
- **API Documentation** - Comprehensive API reference
- **User Guides** - Step-by-step user documentation
- **Developer Docs** - Technical implementation guides
- **Video Tutorials** - Visual learning resources

### Community
- **Issue Tracking** - GitHub Issues for bug reports
- **Feature Requests** - Community-driven feature development
- **Discussions** - Technical discussions and Q&A
- **Security Reports** - Responsible disclosure process

### Contact
- **Email**: support@checkingcheckout.com
- **Website**: [https://checkingcheckout.com](https://checkingcheckout.com)
- **Documentation**: [https://docs.checkingcheckout.com](https://docs.checkingcheckout.com)

---


**Built with ❤️ for the hospitality industry**

*Empowering accommodation providers with modern technology for seamless operations and exceptional guest experiences.*
