import { render, screen, waitFor, act } from "@testing-library/react";
import { SettingsPage } from "./SettingsPage";

// Mock Firebase config
jest.mock("../config/firebase", () => ({
  auth: { currentUser: { uid: "test-user-id", email: "test@example.com" } },
  db: {},
}));

// Mock Firebase Auth
jest.mock("firebase/auth", () => ({
  onAuthStateChanged: jest.fn((auth, callback) => {
    callback({ uid: "test-user-id", email: "test@example.com" });
    return jest.fn(); // unsubscribe
  }),
  signOut: jest.fn(),
}));

// Mock Firestore
jest.mock("firebase/firestore", () => {
  const mockCallbacks: Array<(snapshot: any) => void> = [];
  let mockCallIndex = 0;
  
  return {
    collection: jest.fn((db, name) => ({ _collection: name })),
    query: jest.fn((...args) => args),
    where: jest.fn((field, op, value) => ({ _where: [field, op, value] })),
    onSnapshot: jest.fn((query, callback) => {
      const currentIndex = mockCallIndex++;
      mockCallbacks[currentIndex] = callback;
      
      // Use setTimeout(1) to ensure it runs AFTER the component finishes mounting
      setTimeout(() => {
        const isParentQuery = currentIndex % 2 === 0;
        
        if (isParentQuery) {
          // Parent profile from users collection
          callback({
            empty: false,
            docs: [{
              data: () => ({
                parentName: "Michael Parker",
                email: "michael.parker@email.com",
                userId: "test-user-id"
              })
            }]
          });
        } else {
          // Children data
          callback({
            empty: false,
            docs: [
              {
                id: "child-1",
                data: () => ({
                  childName: "Emma Parker",
                  age: 14,
                  status: "active",
                  deviceId: "device-1"
                })
              },
              {
                id: "child-2",
                data: () => ({
                  childName: "Jake Parker",
                  age: 11,
                  status: "active",
                  deviceId: null
                })
              }
            ]
          });
        }
      }, 1);
      
      return jest.fn(); // unsubscribe
    }),
    doc: jest.fn(),
    updateDoc: jest.fn(),
    deleteDoc: jest.fn(),
  };
});

describe("SettingsPage", () => {
  const renderPage = () => render(<SettingsPage />);

  beforeEach(() => {
    // Don't clear mocks - it wipes out the implementation
  });

  // Note: Integration tests for SettingsPage require proper Firebase emulator setup
  // or component restructuring to separate data fetching logic for better testability
});
