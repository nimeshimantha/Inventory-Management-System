# Bug Fix Report: Newly Created Users Not Displaying in Users & Roles Page

## 1. Executive Summary
On the StockFlow Enterprise **Users & Roles** page (`http://localhost:5173/users`), user creation was succeeding on the backend (`POST /api/v1/users` -> `201 Created`), committing records to PostgreSQL, and showing the success toast (`User account registered successfully`). However, the Users page persistently displayed the empty state:
> **"No users found"**
> *Invite teammates and configure access roles.*

Investigation confirmed that the backend API was correctly persisting users in PostgreSQL and returning `200 OK` with all user records. The issue was isolated to a **frontend response data mapping mismatch** in `client/src/features/users/UsersPage.tsx`.

---

## 2. Exact Root Cause
1. **API Response Structure**:
   `GET /api/v1/users` is handled by `UsersController.list`, which sends:
   ```json
   {
     "success": true,
     "message": "Users retrieved successfully",
     "data": [ /* Array of user records */ ],
     "meta": { "page": 1, "limit": 10, "total": 8, "totalPages": 1 }
   }
   ```
2. **Axios Response Unpacking**:
   In `UsersPage.tsx`, the `useQuery` query function was written as:
   ```ts
   queryFn: async () => {
     const res = await api.get(`/users${search ? `?search=${search}` : ''}`);
     return res.data.data;
   }
   ```
   Because Axios places the HTTP body in `res.data`, returning `res.data.data` provided the raw array (`User[]`).
3. **Flawed Property Access in View Component**:
   The JSX empty state condition and table mapping accessed:
   ```tsx
   !usersData?.users || usersData.users.length === 0
   ...
   usersData.users.map((u: User) => ...)
   ```
   Because `usersData` was an `Array`, `usersData.users` evaluated to `undefined`.
   Consequently, `!usersData?.users` evaluated to `true` on every render, unconditionally triggering the `<EmptyState title="No users found" />` view.
4. **Unhandled Error States**:
   `isError` was not destructured, meaning network/server errors would also erroneously display "No users found" instead of an error state.
5. **Role Badge Property Resolution**:
   `u.roles` returned from `UsersService.listUsers` contains role entities `{ id, code, name }`. Comparing `r === 'SUPER_ADMIN'` directly against the object caused badge variants to default to `'secondary'`.

---

## 3. Files Inspected
- `client/src/features/users/UsersPage.tsx`
- `client/src/types/index.ts`
- `server/src/modules/users/users.controller.ts`
- `server/src/modules/users/users.service.ts`
- `server/src/modules/users/users.router.ts`
- `server/src/shared/utils/apiResponse.ts`
- `server/src/middleware/authenticate.ts`
- `server/src/middleware/authorize.ts`
- `server/src/modules/auth/auth.service.ts`
- `server/prisma/seed.ts`
- `server/tests/api.test.ts`

---

## 4. Files Modified
- [`client/src/features/users/UsersPage.tsx`](file:///d:/React/Inventory%20Management%20System/client/src/features/users/UsersPage.tsx)
  - Normalized `users` array extraction to resiliently handle `res.data.data`, `res.data`, or wrapped objects.
  - Added dedicated `isError` state with retry capability (`refetch`).
  - Corrected table mapping to use the normalized `users` array.
  - Resolved `roleCode` from both object and string representations for accurate badge styling.
- [`server/tests/users.test.ts`](file:///d:/React/Inventory%20Management%20System/server/tests/users.test.ts)
  - Added automated test suite covering user creation, listing, search query filtering, duplicate prevention, and RBAC authorization with zero database pollution (clean `afterAll` teardown).

---

## 5. API Endpoints
- **User Creation**: `POST /api/v1/users`
  - Requires: `Bearer <token>` with `SUPER_ADMIN` or `ADMIN` role.
  - Status: `201 Created`
  - Payload: `{ email, password, firstName, lastName, phone, roleCodes }`
- **User Listing**: `GET /api/v1/users`
  - Requires: `Bearer <token>` with `SUPER_ADMIN` or `ADMIN` role.
  - Query Parameters: `?search=<term>&page=<n>&limit=<n>`
  - Status: `200 OK`
  - Body: `{ success: true, message: "Users retrieved successfully", data: User[], meta: { page, limit, total, totalPages } }`

---

## 6. PostgreSQL Persistence Verification
Direct inspection of PostgreSQL records confirmed that user creation was already persisting records into the database with exact role associations:
- Verified users in database: 8 accounts (including newly created user `Oshani Kaushalya` <`oshani@gmail.com`> assigned `MANAGER` role, and `Nimesh Imantha` assigned `ADMIN` role).
- Relationships in `UserRole` joining `User` to `Role` were verified intact.
- Passwords are securely hashed with Argon2id.

---

## 7. React Query & Data Mapping Changes
- **Query Function**:
  ```ts
  const { data: usersData, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['users', search],
    queryFn: async () => {
      const res = await api.get(`/users${search ? `?search=${encodeURIComponent(search)}` : ''}`);
      return res.data;
    },
  });
  ```
- **Robust Normalization**:
  ```ts
  const users: User[] = Array.isArray(usersData?.data)
    ? usersData.data
    : Array.isArray(usersData)
    ? usersData
    : Array.isArray(usersData?.users)
    ? usersData.users
    : [];
  ```
- **Cache Invalidation**:
  Existing `queryClient.invalidateQueries({ queryKey: ['users'] })` in `createMutation.onSuccess` triggers automatic refetching of all active user queries.

---

## 8. Tests Executed & Actual Results
1. **Automated Integration Tests (`npx vitest run tests/users.test.ts`)**:
   - `TEST 1 & 2`: User creation in PostgreSQL and verification that `GET /api/v1/users` returns the user in `data` array — **PASSED**
   - `TEST 4`: `GET /api/v1/users?search=...` filters correctly — **PASSED**
   - `TEST 8`: Unauthenticated requests (401) and non-admin requests (403) are rejected — **PASSED**
   - `TEST 9`: Duplicate email registration returns 409 Conflict — **PASSED**
2. **Complete Server Suite (`npm run test:server`)**:
   - 2 test files, 18 tests passed (100% passing).
3. **Client TypeScript Build (`npm run build:client`)**:
   - Type-checked (`tsc`) and built with Vite — **PASSED (0 errors)**.
4. **Browser End-to-End Verification**:
   - Navigated to `http://localhost:5173/users`.
   - Verified the Users & Roles table displays all 8 users with full details, role badges, and status switches.
   - Verified that search query "Oshani" dynamically filters the table to the exact matching user.
   - Cleared search and verified full user list renders without empty state.

---

## 9. Remaining Issues
None. The Users & Roles page displays all existing and newly created users in real time, preserves filters, adheres to RBAC, and persists across browser refreshes.
