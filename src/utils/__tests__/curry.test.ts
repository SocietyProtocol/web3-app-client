import { describe, it, expect } from "vitest";
import { prop, toLowerCase } from "../curry";

interface Person {
  name: string;
  email: string;
  age: number;
}

describe("prop", () => {
  it("returns a function that selects a property", () => {
    const getName = prop<Person, "name">("name");
    const p: Person = { name: "Alice", email: "A@EXAMPLE.COM", age: 30 };

    expect(getName(p)).toBe("Alice");
  });
});

describe("toLowerCase", () => {
  it("converts the selected string property to lowercase", () => {
    const getEmail = prop<Person, "email">("email");
    const emailLower = toLowerCase(getEmail);

    const p: Person = { name: "Alice", email: "ALICE@EXAMPLE.COM", age: 30 };
    expect(emailLower(p)).toBe("alice@example.com");
  });

  it("can be composed with prop directly", () => {
    const nameLower = toLowerCase(prop<Person, "name">("name"));
    const p: Person = { name: "BOB", email: "b@e.com", age: 20 };
    expect(nameLower(p)).toBe("bob");
  });
});
