import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChildSelector } from "./ChildSelector";

const mockCollection = jest.fn();
const mockQuery = jest.fn();
const mockWhere = jest.fn();
const mockOnSnapshot = jest.fn();
const mockDoc = jest.fn();
const mockDeleteDoc = jest.fn();

jest.mock("firebase/firestore", () => ({
  collection: (...args: Parameters<typeof mockCollection>) => mockCollection(...args),
  query: (...args: Parameters<typeof mockQuery>) => mockQuery(...args),
  where: (...args: Parameters<typeof mockWhere>) => mockWhere(...args),
  onSnapshot: (...args: Parameters<typeof mockOnSnapshot>) => mockOnSnapshot(...args),
  doc: (...args: Parameters<typeof mockDoc>) => mockDoc(...args),
  deleteDoc: (...args: Parameters<typeof mockDeleteDoc>) => mockDeleteDoc(...args),
}));

jest.mock("../config/firebase", () => ({
  db: { mocked: true },
}));

type SnapshotHandler = {
  refPath: string;
  onNext: (snapshot: any) => void;
  onError: (error: Error) => void;
};

describe("ChildSelector", () => {
const handlers: SnapshotHandler[] = [];

  beforeEach(() => {
    jest.clearAllMocks();
    handlers.length = 0;

    mockCollection.mockReturnValue({ path: "children-collection" });
    mockQuery.mockReturnValue("children-query");
    mockWhere.mockReturnValue("where-query");
    mockDoc.mockImplementation((_db, _col, id) => ({ path: `children/${id}` }));
    mockDeleteDoc.mockResolvedValue(undefined);

    mockOnSnapshot.mockImplementation((ref, onNext, onError) => {
      const refPath = typeof ref === "string" ? ref : ref?.path ?? "unknown";
      const handler = { refPath, onNext, onError };
      handlers.push(handler);
      return jest.fn();
    });
  });

  const fireSnapshot = (children: Array<{ id: string; name: string; email?: string }>) => {
    const docs = children.map((child) => ({
      id: child.id,
      data: () => ({ name: child.name, email: child.email }),
    }));
    handlers.forEach(({ onNext }) =>
      onNext({
        size: docs.length,
        forEach: (callback: (doc: (typeof docs)[number]) => void) => docs.forEach(callback),
      })
    );
  };
  const getPrimaryHandler = () => handlers[0];

  it("renders child cards once Firestore snapshot arrives", async () => {
    const onSelectChild = jest.fn();

    render(
      <ChildSelector parentId="parent-1" onSelectChild={onSelectChild} onCreateNew={jest.fn()} />
    );

    expect(mockCollection).toHaveBeenCalledWith({ mocked: true }, "children");
    expect(mockWhere).toHaveBeenCalledWith("parentId", "==", "parent-1");
    expect(mockQuery).toHaveBeenCalledWith({ path: "children-collection" }, "where-query");
    expect(mockOnSnapshot).toHaveBeenCalled();

    act(() => {
      fireSnapshot([
        { id: "child-a", name: "Ava", email: "ava@example.com" },
        { id: "child-b", name: "Ben" },
      ]);
    });

    expect(await screen.findByText("Ava")).toBeInTheDocument();
    expect(screen.getByText("Ben")).toBeInTheDocument();

    const user = userEvent;
    await user.click(screen.getAllByRole("button", { name: /View Dashboard/i })[0]);
    expect(onSelectChild).toHaveBeenCalledWith("child-a");
  });

  it("shows empty state and pairing shortcut when there are no children", async () => {
    render(<ChildSelector parentId="parent-2" onSelectChild={jest.fn()} onCreateNew={jest.fn()} />);

    act(() => {
      fireSnapshot([]);
    });

    expect(await screen.findByText(/No Children Found/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Go to Pairing/i })).toBeInTheDocument();
  });

  it("removes a child when confirmed and surfaces errors", async () => {
    const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(true);
    mockDeleteDoc.mockRejectedValueOnce(new Error("permission denied"));
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const user = userEvent;

    render(<ChildSelector parentId="parent-3" onSelectChild={jest.fn()} />);

    act(() => {
      fireSnapshot([{ id: "child-z", name: "Zoe" }]);
    });

    await user.click(screen.getByRole("button", { name: /Remove Child/i }));

    await waitFor(() =>
      expect(mockDeleteDoc).toHaveBeenCalledWith({ path: "children/child-z" })
    );
    expect(await screen.findByText(/permission denied/i)).toBeInTheDocument();
    expect(confirmSpy).toHaveBeenCalled();

    confirmSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it("cancels deletion when the confirmation dialog is dismissed", async () => {
    const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(false);

    render(<ChildSelector parentId="parent-4" onSelectChild={jest.fn()} />);

    act(() => {
      fireSnapshot([{ id: "child-y", name: "Yara" }]);
    });

    await userEvent.click(screen.getByRole("button", { name: /Remove Child/i }));
    expect(mockDeleteDoc).not.toHaveBeenCalled();
    expect(confirmSpy).toHaveBeenCalled();

    confirmSpy.mockRestore();
  });

  it("stops loading immediately when no parent id is provided", async () => {
    render(<ChildSelector parentId="" onSelectChild={jest.fn()} onCreateNew={jest.fn()} />);

    expect(await screen.findByText(/No Children Found/i)).toBeInTheDocument();
  });

  it("shows an error state when the Firestore listener fails", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    render(<ChildSelector parentId="parent-error" onSelectChild={jest.fn()} />);

    await waitFor(() => expect(getPrimaryHandler()).toBeDefined());
    const handler = getPrimaryHandler()!;
    act(() => {
      handler.onError({ code: "permission-denied", message: "no-perms" } as any);
    });

    expect(await screen.findByText(/No Children Found/i)).toBeInTheDocument();
    errorSpy.mockRestore();
  });

  it("allows selecting a child by clicking the card itself", async () => {
    const onSelectChild = jest.fn();

    render(<ChildSelector parentId="parent-5" onSelectChild={onSelectChild} />);

    act(() => {
      fireSnapshot([{ id: "child-card", name: "Cardinal" }]);
    });

    await userEvent.click(screen.getByText("Cardinal"));
    expect(onSelectChild).toHaveBeenCalledWith("child-card");
  });

  it("handles refresh button spins and resolves after delay", async () => {
    jest.useFakeTimers();
    render(<ChildSelector parentId="parent-refresh" onSelectChild={jest.fn()} />);

    act(() => {
      fireSnapshot([{ id: "child-r", name: "Relay" }]);
    });

    const refreshButton = screen.getByRole("button", { name: /Refresh child list/i });
    expect(refreshButton).not.toBeDisabled();

    await userEvent.click(refreshButton);
    expect(refreshButton).toBeDisabled();

    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(refreshButton).not.toBeDisabled();
    jest.useRealTimers();
  });

  it("removes a child when Firestore succeeds", async () => {
    mockDeleteDoc.mockResolvedValueOnce(undefined);
    const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(true);

    render(<ChildSelector parentId="parent-success" onSelectChild={jest.fn()} />);

    act(() => {
      fireSnapshot([{ id: "child-success", name: "Sunny" }]);
    });

    await userEvent.click(screen.getByRole("button", { name: /Remove Child/i }));
    await waitFor(() =>
      expect(mockDeleteDoc).toHaveBeenCalledWith({ path: "children/child-success" })
    );

    confirmSpy.mockRestore();
  });

  it("shows the default error message when deleteDoc throws without details", async () => {
    mockDeleteDoc.mockRejectedValueOnce({});
    const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(true);

    render(<ChildSelector parentId="parent-default-error" onSelectChild={jest.fn()} />);

    act(() => {
      fireSnapshot([{ id: "child-default", name: "Duke" }]);
    });

    await userEvent.click(screen.getByRole("button", { name: /Remove Child/i }));
    expect(
      await screen.findByText(/Unable to remove child right now/i)
    ).toBeInTheDocument();
    confirmSpy.mockRestore();
  });

  it("shows 'Unknown' when Firestore omits a name", async () => {
    render(<ChildSelector parentId="parent-unknown" onSelectChild={jest.fn()} />);

    act(() => {
      fireSnapshot([{ id: "child-unknown", name: "" as any }]);
    });

    expect(await screen.findByText("Unknown")).toBeInTheDocument();
  });
});
