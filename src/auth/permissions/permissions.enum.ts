export const ALL_PERMISSIONS = [
  // Dashboard
  'dashboard.view',
  'dashboard.productivity',

  // Clients
  'clients.view',
  'clients.create',
  'clients.edit',
  'clients.delete',

  // Vehicles
  'vehicles.view',
  'vehicles.create',
  'vehicles.edit',
  'vehicles.delete',

  // Work Orders
  'work_orders.view',
  'work_orders.create',
  'work_orders.edit',
  'work_orders.change_status',
  'work_orders.assign',
  'work_orders.delete',

  // Inventory
  'inventory.view',
  'inventory.create',
  'inventory.edit',
  'inventory.delete',
  'inventory.stock_movements',

  // Services
  'services.view',
  'services.create',
  'services.edit',
  'services.delete',

  // Purchases
  'purchases.view',
  'purchases.create',
  'purchases.receive',
  'purchases.cancel',

  // Users
  'users.view',
  'users.create',
  'users.edit',
  'users.deactivate',

  // Roles
  'roles.view',
  'roles.create',
  'roles.edit',
  'roles.delete',

  // Settings
  'settings.view',
  'settings.edit',

  // Reports
  'reports.view',
  'reports.export',

  // Kanban
  'kanban.view',
  'kanban.move',

  // Mechanic view
  'mechanic.view',
  'mechanic.complete_tasks',

  // Notifications
  'notifications.view',
] as const;

export type Permission = (typeof ALL_PERMISSIONS)[number];

// Default permissions for system roles
export const ADMIN_PERMISSIONS: Permission[] = [...ALL_PERMISSIONS];

export const MECHANIC_PERMISSIONS: Permission[] = [
  'dashboard.view',
  'work_orders.view',
  'kanban.view',
  'mechanic.view',
  'mechanic.complete_tasks',
  'notifications.view',
];
