# Lucky Hub eCommerce System

Lucky Hub is a complete eCommerce solution developed for a real stationery and printing business. The system consists of a customer-facing mobile application and an admin web management portal connected through a shared Supabase backend.

## Project Structure

The project is developed using separate branches:

- `main` – Stable and integrated version of the complete system
- `mobile-app` – Customer mobile application development
- `web-admin` – Admin web management application development

After both applications are completed and tested, they will be merged into the `main` branch.

## Mobile Application

The Lucky Hub mobile application allows customers to browse products and place orders using their mobile devices.

### Main Features

- Customer registration and login
- Product browsing
- Product categories
- Product search
- Product details
- Shopping cart
- Wishlist
- Checkout
- Delivery address management
- Order placement
- Order history
- Order tracking
- Printing service requests
- Customer profile management
- Notifications

### Mobile Technologies

- React Native
- Expo
- TypeScript
- Supabase
- PostgreSQL
- Supabase Authentication
- Supabase Storage

## Admin Web Application

The Lucky Hub web application is used by shop administrators and staff to manage business operations.

### Main Features

- Admin authentication
- Dashboard
- Product management
- Category management
- Inventory management
- Order management
- Printing request management
- Customer management
- Sales monitoring
- Business reports
- Notification management
- Business settings

### Web Technologies

- React
- Vite
- JavaScript
- React Router
- Supabase
- PostgreSQL
- Lucide React
- jsPDF

## Backend and Database

Both the mobile application and web management portal use the same Supabase backend.

Supabase provides:

- PostgreSQL database
- Authentication
- Row Level Security
- Storage
- Realtime updates
- Database triggers

The shared backend allows information to remain synchronized between the customer mobile application and the admin web portal.

Example workflow:

Customer Mobile App → Supabase → Admin Web Portal

When a customer places an order using the mobile application, the order is stored in Supabase and becomes available to the admin through the web management portal.

## Main Business Modules

The system includes:

- Products
- Categories
- Inventory
- Customers
- Orders
- Order Items
- Printing Requests
- Sales
- Notifications
- Application Settings

## Development Workflow

Development is maintained using Git branches.

```text
mobile-app ─────┐
                ├── main
web-admin ──────┘
