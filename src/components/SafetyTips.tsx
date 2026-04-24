import { useState } from "react";
import { Lightbulb, ChevronRight, X, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface Tip {
  title: string;
  description: string;
  fullContent: string;
  link?: string;
}

const tips: Tip[] = [
  {
    title: "Share your live location",
    description: "Let trusted contacts track your journey in real-time",
    fullContent: "When traveling alone, especially at night, share your live location with a trusted friend or family member. Most phones have built-in location sharing features. Set a time limit for sharing, and let them know when you've arrived safely. This creates a digital safety net without being intrusive.",
    link: "https://support.google.com/maps/answer/7326816",
  },
  {
    title: "Trust your instincts",
    description: "If something feels wrong, move to a safe place immediately",
    fullContent: "Your gut feeling is often right. If a situation, place, or person makes you uncomfortable, don't ignore that feeling. Move to a well-lit, populated area immediately. Don't worry about being polite - your safety comes first. Look for open businesses, security personnel, or other people who can help.",
  },
  {
    title: "Keep emergency numbers ready",
    description: "Save local emergency services on speed dial",
    fullContent: "Save emergency numbers for quick access: 112 (Emergency), 988 (Mental Health Crisis), local police non-emergency line, and a trusted contact. Consider setting up emergency SOS features on your phone that can quickly call for help with a button combination.",
  },
  {
    title: "Stay aware of your surroundings",
    description: "Avoid distractions like headphones in unfamiliar areas",
    fullContent: "When walking alone, keep your head up and stay alert. Avoid wearing headphones in both ears, looking at your phone constantly, or appearing distracted. Make brief eye contact with people around you - this shows you're aware. Know where exits are located in buildings and have an escape plan.",
  },
  {
    title: "Use the buddy system",
    description: "Travel with a friend whenever possible",
    fullContent: "There's safety in numbers. When possible, travel with a friend or group, especially at night or in unfamiliar areas. If you must go alone, let someone know your plans, expected route, and arrival time. Check in with them when you arrive safely.",
  },
];

const SafetyTips = () => {
  const [selectedTip, setSelectedTip] = useState<Tip | null>(null);

  return (
    <>
      <Card className="gradient-card shadow-card border-0">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-accent-foreground" />
            Safety Tips
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {tips.slice(0, 3).map((tip, index) => (
            <div
              key={index}
              onClick={() => setSelectedTip(tip)}
              className="group flex items-start gap-3 p-3 rounded-xl bg-accent/50 hover:bg-accent transition-colors cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center flex-shrink-0 shadow-sm">
                <span className="text-sm font-bold text-primary">{index + 1}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground">{tip.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{tip.description}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 mt-1" />
            </div>
          ))}
          
          <Button 
            variant="ghost" 
            className="w-full text-primary hover:text-primary/80"
            onClick={() => setSelectedTip(tips[0])}
          >
            View all safety tips
          </Button>
        </CardContent>
      </Card>

      {/* Tip Detail Dialog */}
      <Dialog open={!!selectedTip} onOpenChange={(open) => !open && setSelectedTip(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-primary" />
              {selectedTip?.title}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {selectedTip?.description}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-foreground leading-relaxed">
              {selectedTip?.fullContent}
            </p>
            {selectedTip?.link && (
              <Button variant="outline" className="w-full" asChild>
                <a href={selectedTip.link} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Learn More
                </a>
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SafetyTips;
