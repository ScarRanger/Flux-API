'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ShoppingCart, Store, Zap, DollarSign, Shield, TrendingUp } from 'lucide-react';

interface RoleSelectionDialogProps {
  open: boolean;
  onRoleSelected: (role: 'buyer' | 'seller') => void;
  userEmail?: string;
}

export function RoleSelectionDialog({ 
  open, 
  onRoleSelected,
  userEmail 
}: RoleSelectionDialogProps) {
  const [selectedRole, setSelectedRole] = useState<'buyer' | 'seller' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedRole) return;
    
    setIsSubmitting(true);
    try {
      await onRoleSelected(selectedRole);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} modal>
      <DialogContent 
        className="sm:max-w-[600px]" 
        showCloseButton={false}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-2xl text-center">Welcome to API Marketplace! 🎉</DialogTitle>
          <DialogDescription className="text-center text-base">
            {userEmail && (
              <span className="block mb-2 font-medium text-foreground">
                {userEmail}
              </span>
            )}
            Please select your role to complete your account setup
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
          {/* Buyer Card */}
          <Card
            className={`p-6 cursor-pointer transition-all border-2 hover:shadow-lg ${
              selectedRole === 'buyer'
                ? 'border-primary bg-primary/5 shadow-lg'
                : 'border-border hover:border-primary/50'
            }`}
            onClick={() => setSelectedRole('buyer')}
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className={`p-4 rounded-full ${
                selectedRole === 'buyer' ? 'bg-primary/20' : 'bg-muted'
              }`}>
                <ShoppingCart className={`w-8 h-8 ${
                  selectedRole === 'buyer' ? 'text-primary' : 'text-muted-foreground'
                }`} />
              </div>
              
              <div>
                <h3 className="text-xl font-bold mb-2">Buyer</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Purchase and consume API quotas
                </p>
              </div>

              <div className="space-y-2 w-full text-left">
                <div className="flex items-start gap-2 text-sm">
                  <Zap className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <span>Access thousands of APIs</span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <DollarSign className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Pay only for what you use</span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <Shield className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                  <span>Secure escrow payments</span>
                </div>
              </div>

              <div className={`w-full py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                selectedRole === 'buyer'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}>
                {selectedRole === 'buyer' ? '✓ Selected' : 'Select Buyer'}
              </div>
            </div>
          </Card>

          {/* Seller Card */}
          <Card
            className={`p-6 cursor-pointer transition-all border-2 hover:shadow-lg ${
              selectedRole === 'seller'
                ? 'border-primary bg-primary/5 shadow-lg'
                : 'border-border hover:border-primary/50'
            }`}
            onClick={() => setSelectedRole('seller')}
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className={`p-4 rounded-full ${
                selectedRole === 'seller' ? 'bg-primary/20' : 'bg-muted'
              }`}>
                <Store className={`w-8 h-8 ${
                  selectedRole === 'seller' ? 'text-primary' : 'text-muted-foreground'
                }`} />
              </div>
              
              <div>
                <h3 className="text-xl font-bold mb-2">Seller</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  List your APIs and earn revenue
                </p>
              </div>

              <div className="space-y-2 w-full text-left">
                <div className="flex items-start gap-2 text-sm">
                  <Store className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                  <span>List unlimited APIs</span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <TrendingUp className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Earn from API usage</span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <Shield className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                  <span>Automated payments</span>
                </div>
              </div>

              <div className={`w-full py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                selectedRole === 'seller'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}>
                {selectedRole === 'seller' ? '✓ Selected' : 'Select Seller'}
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Button
            onClick={handleSubmit}
            disabled={!selectedRole || isSubmitting}
            className="w-full"
            size="lg"
          >
            {isSubmitting ? 'Setting up your account...' : 'Continue'}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Don't worry, you can always change your role later in settings
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
