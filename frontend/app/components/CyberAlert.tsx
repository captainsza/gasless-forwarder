import { motion, AnimatePresence } from "framer-motion";
import { XCircleIcon, CheckCircleIcon, ExclamationTriangleIcon } from "@heroicons/react/24/solid";
import React from "react";

interface CyberAlertProps {
  type: 'success' | 'error' | 'warning';
  message: string;
  isOpen: boolean;
  onClose?: () => void;
}

const CyberAlert: React.FC<CyberAlertProps> = ({ type, message, isOpen, onClose }) => {
  const colors = {
    success: 'from-cyber-blue to-green-500',
    error: 'from-red-500 to-cyber-pink',
    warning: 'from-yellow-500 to-cyber-purple'
  };

  const icons = {
    success: <CheckCircleIcon className="w-6 h-6" />,
    error: <XCircleIcon className="w-6 h-6" />,
    warning: <ExclamationTriangleIcon className="w-6 h-6" />
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-4 right-4 z-50 max-w-md"
        >
          <div className="relative">
            <div className={`bg-cyber-dark border-2 border-transparent bg-gradient-to-r ${colors[type]} p-1 rounded-lg shadow-neon`}>
              <div className="bg-cyber-dark p-4 rounded-lg">
                <div className="flex items-start space-x-4">
                  <div className={`flex-shrink-0 bg-gradient-to-r ${colors[type]} rounded-full p-2`}>
                    {icons[type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white">{message}</p>
                  </div>
                  {onClose && (
                    <button
                      onClick={onClose}
                      className="flex-shrink-0 hover:text-cyber-blue transition-colors"
                    >
                      <XCircleIcon className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
            <motion.div
              animate={{
                background: [
                  `linear-gradient(90deg, transparent, ${type === 'success' ? '#00fff9' : type === 'error' ? '#ff00ff' : '#7928ca'}, transparent)`,
                ],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatType: "reverse",
              }}
              className="absolute bottom-0 left-0 w-full h-[2px]"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CyberAlert;
