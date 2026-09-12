# Lucky Hub E-Commerce Mobile Application

A full-stack mobile e-commerce and printing service application developed for **Lucky Hub**, a stationery and printing business.

The application allows customers to browse stationery products, manage their cart and wishlist, apply coupons and offers, calculate delivery charges, place orders, track orders, and submit printing requests.

## Technologies

### Mobile Application
- React Native
- Expo
- TypeScript
- Expo Router

### Backend
- Supabase
- PostgreSQL
- Supabase Authentication
- Supabase Storage
- Row Level Security (RLS)

### Notifications
- Expo Notifications

## Main Features

- User Registration and Login
- Persistent User Sessions
- Product Categories
- Product Search
- Product Details
- Product Variants
- Colour Variants
- Weight Variants
- Page Variants
- Wishlist
- Shopping Cart
- Flash Deals
- Discount Coupons
- Coupon Usage Tracking
- Delivery Charge Calculation
- Store Pickup
- Checkout
- Cash on Delivery
- Order Creation
- Order History
- Order Details
- Order Tracking
- Order Status Notifications
- Saved Addresses
- User Profile
- Printing Service
- Printing File Upload
- Printing Request History

## Delivery Areas

Currently configured delivery areas:

- Nintavur — LKR 150
- Kalmunai — LKR 200
- Store Pickup — Free

Delivery areas and charges are stored in the backend and can be updated dynamically.

## Coupon System

The application supports configurable coupons with:

- Percentage discounts
- Minimum order amount
- Maximum discount
- Expiry dates
- Usage limits
- Coupon redemption tracking
- Free delivery coupons

Example:

`LUCKY10` — 10% discount on eligible orders.

## Flash Deals

Products can have time-based promotional offers.

The mobile application automatically displays:

- Original price
- Offer price
- Discount percentage
- Active flash deals

## Order Tracking

Customers can view order progress through stages such as:

1. Order Confirmed
2. Processing
3. Shipped
4. Out for Delivery
5. Delivered

Local notifications are also generated when order statuses change.

## Printing Service

Customers can upload documents and submit printing requests through the application.

Printing functionality includes:

- File selection
- File upload
- Printing request creation
- Request history
- Printing status tracking

## Application Architecture

```text
Customer
   |
   v
React Native Mobile App
   |
   v
Supabase
   |
   +-- PostgreSQL Database
   +-- Authentication
   +-- Storage
   +-- Row Level Security
   +-- Business Data