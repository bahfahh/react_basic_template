import { FC } from 'react';
import { AttachmentsUpload } from '../AttachmentsUpload/AttachmentsUpload';
import { AIInputWithSuggestions } from '@/components/ui/ai-input-with-suggestions'; // Import the new component

interface ChatInputProps {
  // value: string; // No longer needed directly for the input text
  // onChange: (value: string) => void; // Input manages its own state
  onSend: (text: string, action?: string) => void; // Modified to potentially receive text/action
  onFileSelect: (filename: string) => void;
  disabled?: boolean;
}

export const ChatInput: FC<ChatInputProps> = ({
  // value, // Removed
  // onChange, // Removed
  onSend,
  onFileSelect,
  disabled = false // Keep disabled prop for AttachmentsUpload for now
}) => {

  // handleKeyPress removed as AIInputWithSuggestions handles Enter key

  const handleSuggestionSubmit = (text: string, action?: string) => {
    // Call the original onSend function passed from the parent
    // The AIInputWithSuggestions component clears its own input value internally
    onSend(text, action);
  };

  return (
    // Reduced padding, border handled by AIInputWithSuggestions mostly
    <div className="p-2 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      {/* Adjusted layout for new component */}
      <div className="flex items-end gap-2 max-w-4xl mx-auto">
        {/* AIInput takes flex-grow */}
        <AIInputWithSuggestions
          onSubmit={handleSuggestionSubmit}
          placeholder="Type your message or select an action..."
          className="flex-1 py-0" // Remove default padding to fit better
          // We might need to pass min/maxHeight if defaults aren't suitable
          // minHeight={44} // Example: Match original textarea min-height
          // We could potentially pass the 'disabled' prop if we modify AIInputWithSuggestions
        />
        {/* Attachment button */}
        <div className="flex-shrink-0 pb-1"> {/* Added padding bottom to align */}
          <AttachmentsUpload
            onFileSelect={onFileSelect}
            disabled={disabled}
          />
        </div>
        {/* Send button removed - handled by AIInputWithSuggestions */}
      </div>
    </div>
  );
};