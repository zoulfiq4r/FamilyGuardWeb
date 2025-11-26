import { render, screen } from "@testing-library/react";
import { AppManagement } from "./AppManagement";

// Mock hooks
jest.mock("../hooks/useChildTelemetry", () => ({
  useChildCurrentApp: jest.fn(() => ({
    currentApp: null,
  })),
}));

// Mock Firebase
jest.mock("firebase/firestore", () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(() => Promise.resolve({ exists: () => false })),
  onSnapshot: jest.fn(() => jest.fn()),
  serverTimestamp: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
}));

jest.mock("../config/firebase", () => ({
  auth: { currentUser: { uid: "test-user" } },
  db: {},
}));

// Mock Lucide icons
jest.mock("lucide-react", () => ({
  Smartphone: () => <div>Smartphone</div>,
  Search: () => <div>Search</div>,
  Filter: () => <div>Filter</div>,
  Youtube: () => <div>Youtube</div>,
  Instagram: () => <div>Instagram</div>,
  MessageCircle: () => <div>MessageCircle</div>,
  Mail: () => <div>Mail</div>,
  Camera: () => <div>Camera</div>,
  Music: () => <div>Music</div>,
  ShoppingBag: () => <div>ShoppingBag</div>,
  Chrome: () => <div>Chrome</div>,
  Ban: () => <div>Ban</div>,
  CheckCircle: () => <div>CheckCircle</div>,
  Clock: () => <div>Clock</div>,
  AlertCircle: () => <div>AlertCircle</div>,
}));

describe("AppManagement", () => {
  it("renders without crashing", () => {
    render(<AppManagement childId="test-child" />);
    expect(screen.getByText(/App Management/i)).toBeInTheDocument();
  });

  it("displays search input", () => {
    render(<AppManagement childId="test-child" />);
    expect(screen.getByPlaceholderText(/Search apps/i)).toBeInTheDocument();
  });

  it("displays filter by category select", () => {
    render(<AppManagement childId="test-child" />);
    expect(screen.getByText(/All Categories/i)).toBeInTheDocument();
  });

  it("displays filter by status select", () => {
    render(<AppManagement childId="test-child" />);
    expect(screen.getByText(/All Status/i)).toBeInTheDocument();
  });
});