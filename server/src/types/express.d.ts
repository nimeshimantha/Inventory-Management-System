export interface AuthenticatedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[]; // e.g. ['SUPER_ADMIN', 'ADMIN']
  permissions: string[]; // e.g. ['products:write', 'inventory:adjust']
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}
