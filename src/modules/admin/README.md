# Admin Module

This module handles all administrative functionality for system management.

## Features

- User management (create, update, delete, role assignment)
- System settings configuration
- Database backup and maintenance
- Excel data import interface
- Audit log viewing
- System health monitoring

## Directory Structure

### api/
API endpoints for admin operations
- User CRUD operations
- Settings management
- Import/export handlers

### components/
Admin-specific UI components
- User management tables
- Settings forms
- Import status displays

### services/
Business logic for admin operations
- User service
- Settings service
- Import/export service

### types/
TypeScript interfaces for admin features
- User types
- Settings types
- Import/export types

## Access Control

All admin features require:
- Authentication
- Admin role (UserRole.admin)
- Middleware validation

## Key Components

- **UserManagementTable**: Display and manage system users
- **ExcelImporter**: Handle Excel file uploads and processing
- **SettingsPanel**: System configuration interface
- **AuditLogViewer**: View system audit trail