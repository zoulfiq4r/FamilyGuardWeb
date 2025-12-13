import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, doc, deleteDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import { UserPlus, Users, RefreshCw } from "lucide-react";

interface Child {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
}

interface ChildSelectorProps {
  parentId: string;
  onSelectChild: (childId: string) => void;
  onCreateNew?: () => void;
}

export function ChildSelector({ parentId, onSelectChild, onCreateNew }: ChildSelectorProps) {
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [deletingChildId, setDeletingChildId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDeleteChild = async (childId: string, childName: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to remove ${childName}?\n\nThis will permanently delete their profile from Firestore.`
    );
    if (!confirmed) {
      return;
    }

    setDeleteError(null);
    setDeletingChildId(childId);

    try {
      console.log("ChildSelector: Deleting child from Firestore:", { childId, childName });
      await deleteDoc(doc(db, "children", childId));
      console.log("ChildSelector: Successfully deleted child from Firestore:", childId);
      // The real-time listener will automatically update the UI when the document is deleted
    } catch (error: any) {
      console.error("ChildSelector: Failed to delete child from Firestore:", error);
      const message = error?.message || "Unable to remove child right now. Please try again.";
      setDeleteError(message);
    } finally {
      setDeletingChildId(null);
    }
  };

  useEffect(() => {
    if (!parentId) {
      setLoading(false);
      return;
    }

    // Use real-time listener to automatically update when children are added
    const childrenRef = collection(db, "children");
    const q = query(childrenRef, where("parentId", "==", parentId));
    
    console.log("ChildSelector: Setting up listener for parentId:", parentId);
    
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        console.log(`ChildSelector: Snapshot received - ${querySnapshot.size} children found for parentId ${parentId}`);
        const childrenList: Child[] = [];
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          console.log("ChildSelector: Child document:", {
            id: doc.id,
            name: data.name,
            parentId: data.parentId,
            email: data.email,
            allFields: Object.keys(data)
          });
          
          childrenList.push({
            id: doc.id,
            name: data.name || "Unknown",
            email: data.email,
            avatar: data.avatar,
          });
        });
        
        console.log("ChildSelector: Final children list:", childrenList);
        setChildren(childrenList);
        setLoading(false);
      },
      (error) => {
        console.error("ChildSelector: Error fetching children:", error);
        console.error("Error details:", {
          code: error.code,
          message: error.message,
          parentId
        });
        setLoading(false);
      }
    );

    // Cleanup listener on unmount
    return () => unsubscribe();
  }, [parentId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading children...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-500 rounded-full mb-4">
            <Users className="w-10 h-10 text-white" />
          </div>
          <div className="flex items-center justify-center gap-4 mb-2">
            <h1 className="text-3xl font-bold text-gray-800">Select a Child</h1>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setRefreshing(true);
                // Force a small delay to show refresh state, then let the listener update
                setTimeout(() => setRefreshing(false), 1000);
              }}
              disabled={refreshing}
              className="h-8 w-8 p-0"
              aria-label="Refresh child list"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <p className="text-gray-500">Choose a child to view their dashboard and activity</p>
          <p className="text-xs text-gray-400 mt-1">
            The list updates automatically when a new device is paired
          </p>
        </div>

        {deleteError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
            {deleteError}
          </div>
        )}

        {children.length === 0 ? (
          <Card className="text-center p-12">
            <CardContent>
              <UserPlus className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-gray-800 mb-2">No Children Found</h2>
              <p className="text-gray-500 mb-4">
                You haven't paired any devices yet. Generate a pairing code to add a child's device.
              </p>
              <p className="text-sm text-gray-400 mb-6">
                After entering the pairing code in the mobile app, the child should appear here automatically.
              </p>
              {onCreateNew && (
                <Button onClick={onCreateNew} className="bg-blue-500 hover:bg-blue-600">
                  Go to Pairing
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {children.map((child) => (
              <Card
                key={child.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => onSelectChild(child.id)}
              >
                <CardContent className="p-6">
                  <div className="flex flex-col items-center text-center">
                    <Avatar className="w-20 h-20 mb-4">
                      <AvatarFallback className="bg-blue-100 text-blue-600 text-2xl">
                        {child.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <h3 className="text-xl font-semibold text-gray-800 mb-1">{child.name}</h3>
                    {child.email && (
                      <p className="text-sm text-gray-500 mb-4">{child.email}</p>
                    )}
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectChild(child.id);
                      }}
                    >
                      View Dashboard
                    </Button>
                    <Button
                      variant="destructive"
                      className="w-full mt-3"
                      disabled={deletingChildId === child.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteChild(child.id, child.name);
                      }}
                    >
                      {deletingChildId === child.id ? "Removing..." : "Remove Child"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {onCreateNew && (
              <Card
                className="cursor-pointer hover:shadow-lg transition-shadow border-dashed border-2 border-gray-300"
                onClick={onCreateNew}
              >
                <CardContent className="p-6">
                  <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                      <UserPlus className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">Add New Child</h3>
                    <p className="text-sm text-gray-500">Pair a new device</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
