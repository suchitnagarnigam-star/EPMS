import { createContext, useContext, useState, type ReactNode } from 'react';
import { fetchWorks, type WorkRecord } from '../data/api';
import WorkDetailModal from '../components/WorkDetailModal';

interface WorkModalContextType {
  openWorkModal: (workId: string, initialWork?: WorkRecord) => void;
  closeWorkModal: () => void;
  selectedWorkId: string | null;
  isOpen: boolean;
}

const WorkModalContext = createContext<WorkModalContextType | undefined>(undefined);

export const WorkModalProvider = ({ children }: { children: ReactNode }) => {
  const [selectedWorkId, setSelectedWorkId] = useState<string | null>(null);
  const [selectedWork, setSelectedWork] = useState<WorkRecord | null>(null);
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const openWorkModal = (workId: string, initialWork?: WorkRecord) => {
    setSelectedWorkId(workId);
    setIsOpen(true);
    if (initialWork) {
      setSelectedWork(initialWork);
    } else {
      setSelectedWork(null);
      fetchWorks({ search: workId, page_size: 1 })
        .then(res => {
          const match = res.results.find(w => w.work_id === workId) || res.results[0];
          if (match) setSelectedWork(match);
        })
        .catch(err => console.error("Failed to load work details:", err));
    }
  };

  const closeWorkModal = () => {
    setIsOpen(false);
    setSelectedWorkId(null);
    setSelectedWork(null);
  };

  return (
    <WorkModalContext.Provider value={{ openWorkModal, closeWorkModal, selectedWorkId, isOpen }}>
      {children}
      <WorkDetailModal work={isOpen ? selectedWork : null} onClose={closeWorkModal} />
    </WorkModalContext.Provider>
  );
};

export const useWorkModal = () => {
  const context = useContext(WorkModalContext);
  if (!context) {
    throw new Error('useWorkModal must be used within a WorkModalProvider');
  }
  return context;
};
