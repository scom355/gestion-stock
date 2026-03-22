-- Database Schema for Carrefour Stock Management (Resilient Version)

CREATE DATABASE IF NOT EXISTS carrefour_stock;
USE carrefour_stock;

-- 1. Categories Table
CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

-- 2. Products Table (Updated for Current App Logic)
CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    barcode VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    price_buy DECIMAL(10, 2) DEFAULT 0.00,
    sell_price DECIMAL(10, 2) NOT NULL,
    stock_current INT DEFAULT 0,
    expiry VARCHAR(50) DEFAULT '',
    offer INT DEFAULT 0, -- 0: No offer, 1: 2nd unit -50%
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sample Data
INSERT INTO categories (name) VALUES ('General');
