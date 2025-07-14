import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Brain, Sparkles } from 'lucide-react';
import AIAssistant from './AIAssistant';
import { Contact } from '@/services/api';

interface AIAssistantButtonProps {
  contact?: Contact;
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
  children?: React.ReactNode;
}

const AIAssistantButton: React.FC<AIAssistantButtonProps> = ({ 
  contact, 
  variant = 'outline', 
  size = 'sm',
  className = '',
  children 
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant={variant} 
          size={size} 
          className={`${className} relative overflow-hidden group hover:shadow-lg transition-all duration-300`}
        >
          <div className="flex items-center gap-2">
            <div className="relative">
              <Brain className="h-4 w-4 transition-transform group-hover:scale-110" />
              <Sparkles className="h-2 w-2 absolute -top-1 -right-1 text-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            {children || 'AI Assistant'}
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-500" />
            AI Assistant
            {contact && (
              <span className="text-sm font-normal text-gray-500">
                for {contact.name}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>
        <AIAssistant contact={contact} onClose={() => setIsOpen(false)} />
      </DialogContent>
    </Dialog>
  );
};

export default AIAssistantButton; 