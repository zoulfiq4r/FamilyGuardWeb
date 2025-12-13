import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { ContentMonitoring } from "./ContentMonitoring";
import * as firestore from "firebase/firestore";

jest.mock("../config/firebase", () => ({ db: {} }));
jest.mock("firebase/firestore", () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  onSnapshot: jest.fn(),
  limit: jest.fn(),
  doc: jest.fn(),
  updateDoc: jest.fn(),
}));

describe("ContentMonitoring", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows loading then empty state when no alerts", async () => {
    const mockUnsub = jest.fn();
    (firestore.onSnapshot as jest.Mock).mockImplementation((q, onNext) => {
      // Simulate async arrival of empty snapshot
      setTimeout(() => onNext({ docs: [] }), 0);
      return mockUnsub;
    });

    render(<ContentMonitoring parentId="parent-1" />);
    // Loading state
    expect(screen.getByText(/Loading content alerts/i)).toBeInTheDocument();

    // Then empty state
    await waitFor(() => {
      expect(
        screen.getByText(/No content alerts detected/i)
      ).toBeInTheDocument();
    });
  });

  it("renders one alert and allows marking reviewed", async () => {
    const mockAlert = {
      id: "a-1",
      parentId: "parent-1",
      childName: "Alex",
      appName: "Instagram",
      createdAt: { toDate: () => new Date() },
      reviewed: false,
      riskLevel: "HIGH",
      safeSearchScores: { adult: 0.8, violence: 0.2, racy: 0.1 },
    };

    (firestore.onSnapshot as jest.Mock).mockImplementation((q, onNext) => {
      onNext({
        docs: [
          {
            id: mockAlert.id,
            data: () => mockAlert,
          },
        ],
      });
      return jest.fn();
    });

    (firestore.doc as jest.Mock).mockReturnValue("doc-ref");
    const updateSpy = jest
      .spyOn(firestore, "updateDoc")
      .mockResolvedValue(undefined as any);

    render(<ContentMonitoring parentId="parent-1" />);

    // Alert rendered (avoid multiple assertions within a single waitFor)
    await screen.findByText(/Alex/);
    await screen.findByText(/Instagram/);
    await screen.findByText(/HIGH RISK/);

    // Mark reviewed
    fireEvent.click(screen.getByRole("button", { name: /Mark Reviewed/i }));
    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalled();
    });
  });
});
