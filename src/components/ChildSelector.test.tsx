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
  onNext: (snapshot: any) => void;
  onError: (error: Error) => void;
};

describe("ChildSelector", () => {
  const handlers: SnapshotHandler[] = [];

  beforeEach(() => {
    jest.clearAllMocks();
    handlers.length = 0;

    mockCollection.mockReturnValue("children-collection");
    mockQuery.mockReturnValue("children-query");
    mockWhere.mockReturnValue("where-query");
    mockDoc.mockImplementation((_db, _col, id) => ({ path: `children/${id}` }));
    mockDeleteDoc.mockResolvedValue(undefined);

    mockOnSnapshot.mockImplementation((_query, onNext, onError) => {
      const handler = { onNext, onError };
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

  it("renders child cards once Firestore snapshot arrives", async () => {
    const onSelectChild = jest.fn();

    render(
      <ChildSelector parentId="parent-1" onSelectChild={onSelectChild} onCreateNew={jest.fn()} />
    );

    expect(mockCollection).toHaveBeenCalledWith({ mocked: true }, "children");
    expect(mockWhere).toHaveBeenCalledWith("parentId", "==", "parent-1");
    expect(mockQuery).toHaveBeenCalledWith("children-collection", "where-query");
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
  });
});
