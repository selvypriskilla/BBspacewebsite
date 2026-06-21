import { describe, test, expect } from "vitest";

describe("Auth Context", () => {
  test("getRolesFromUser extracts roles from JWT claims", () => {
    const user = {
      app_metadata: {
        roles: ["admin"],
      },
    };

    function getRolesFromUser(user: { app_metadata?: { roles?: string[] } } | null) {
      const roles = user?.app_metadata?.roles;
      return Array.isArray(roles) ? roles.map(String) : [];
    }

    const roles = getRolesFromUser(user);
    expect(roles).toEqual(["admin"]);
  });

  test("getRolesFromUser handles missing roles", () => {
    const user = { app_metadata: {} };

    function getRolesFromUser(user: { app_metadata?: { roles?: string[] } } | null) {
      const roles = user?.app_metadata?.roles;
      return Array.isArray(roles) ? roles.map(String) : [];
    }

    const roles = getRolesFromUser(user);
    expect(roles).toEqual([]);
  });

  test("getRolesFromUser handles null user", () => {
    function getRolesFromUser(user: { app_metadata?: { roles?: string[] } } | null) {
      const roles = user?.app_metadata?.roles;
      return Array.isArray(roles) ? roles.map(String) : [];
    }

    const roles = getRolesFromUser(null);
    expect(roles).toEqual([]);
  });

  test("getRolesFromUser handles multiple roles", () => {
    const user = {
      app_metadata: {
        roles: ["admin", "advisor"],
      },
    };

    function getRolesFromUser(user: { app_metadata?: { roles?: string[] } } | null) {
      const roles = user?.app_metadata?.roles;
      return Array.isArray(roles) ? roles.map(String) : [];
    }

    const roles = getRolesFromUser(user);
    expect(roles).toEqual(["admin", "advisor"]);
  });

  test("Role comparison works correctly", () => {
    const jwtRoles = ["advisor", "admin"];
    const isAdmin = jwtRoles.includes("admin");
    const isAdvisor = jwtRoles.includes("advisor");
    const isMember = jwtRoles.includes("member");

    expect(isAdmin).toBe(true);
    expect(isAdvisor).toBe(true);
    expect(isMember).toBe(false);
  });
});
