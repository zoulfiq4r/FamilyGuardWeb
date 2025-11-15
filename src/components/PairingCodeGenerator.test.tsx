import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PairingCodeGenerator } from "./PairingCodeGenerator";

const mockCreatePairingCode = jest.fn();

jest.mock("../config/firebase", () => ({
  createPairingCode: (...args: Parameters<typeof mockCreatePairingCode>) =>
    mockCreatePairingCode(...args),
}));

describe("PairingCodeGenerator", () => {
  const setup = () => render(<PairingCodeGenerator userId="parent-123" />);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the default form state", () => {
    setup();

    expect(
      screen.getByRole("heading", { name: /Pair New Device/i })
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Child's Name/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Generate Pairing Code/i })
    ).toBeInTheDocument();
  });

  it("requires a child name before generating", async () => {
    const user = userEvent;
    const alertSpy = jest.spyOn(window, "alert").mockImplementation(() => {});

    setup();
    await user.click(
      screen.getByRole("button", { name: /Generate Pairing Code/i })
    );

    expect(alertSpy).toHaveBeenCalledWith("Please enter child's name");
    expect(mockCreatePairingCode).not.toHaveBeenCalled();

    alertSpy.mockRestore();
  });

  it("shows the generated code and allows resetting", async () => {
    const user = userEvent;
    mockCreatePairingCode.mockResolvedValueOnce("ABC123");

    setup();
    await user.type(screen.getByLabelText(/Child's Name/i), "Milo");
    await user.click(
      screen.getByRole("button", { name: /Generate Pairing Code/i })
    );

    await waitFor(() =>
      expect(mockCreatePairingCode).toHaveBeenCalledWith("parent-123", "Milo")
    );

    expect(await screen.findByText(/Code Generated/i)).toBeInTheDocument();
    expect(await screen.findByText("ABC123")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /Generate Another Code/i })
    );
    expect(
      screen.getByRole("button", { name: /Generate Pairing Code/i })
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Child's Name/i)).toHaveValue("");
  });

  it("alerts when the Firebase helper rejects", async () => {
    const user = userEvent;
    const alertSpy = jest.spyOn(window, "alert").mockImplementation(() => {});
    mockCreatePairingCode.mockRejectedValueOnce(new Error("Firestore down"));

    setup();
    await user.type(screen.getByLabelText(/Child's Name/i), "Maya");
    await user.click(
      screen.getByRole("button", { name: /Generate Pairing Code/i })
    );

    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith(
        "Error generating code: Firestore down"
      )
    );

    alertSpy.mockRestore();
  });
});
