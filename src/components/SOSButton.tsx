import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Shield, AlertTriangle } from "lucide-react";

interface SOSButtonProps {
  onActivate: () => void;
  isActive: boolean;
}

const SOSButton = ({ onActivate, isActive }: SOSButtonProps) => {
  const [isPressed, setIsPressed] = useState(false);

  const handlePress = () => {
    setIsPressed(true);
    onActivate();
    setTimeout(() => setIsPressed(false), 300);
  };

  return (
    <div className="relative flex flex-col items-center gap-6">
      {/* Decorative rings */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-44 h-44 rounded-full border-2 border-sos/20 animate-ping" style={{ animationDuration: '3s' }} />
        <div className="absolute w-52 h-52 rounded-full border border-sos/10 animate-ping" style={{ animationDuration: '4s' }} />
      </div>

      {/* Main SOS Button */}
      <Button
        variant="sos"
        size="sos"
        onClick={handlePress}
        className={`relative z-10 flex flex-col items-center justify-center gap-1 transition-all duration-300 ${
          isPressed ? 'scale-95' : ''
        } ${isActive ? 'ring-4 ring-sos/50' : ''}`}
      >
        {isActive ? (
          <AlertTriangle className="w-10 h-10" />
        ) : (
          <Shield className="w-10 h-10" />
        )}
        <span className="text-lg font-bold tracking-wide">SOS</span>
      </Button>

      {/* Status text */}
      <p className="text-center text-muted-foreground font-medium">
        {isActive ? (
          <span className="text-sos font-semibold">Alert sent! Help is on the way.</span>
        ) : (
          <span>Tap to send emergency alert</span>
        )}
      </p>
    </div>
  );
};

export default SOSButton;
