import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  index?: number;
}

export default function FeatureCard({
  icon: Icon,
  title,
  description,
  index = 0,
}: FeatureCardProps) {
  return (
    <Card
      className="group hover-elevate active-elevate-2 transition-all duration-300 border-card-border h-full"
      style={{
        animationDelay: `${index * 100}ms`,
        animationFillMode: "backwards",
      }}
      data-testid={`card-feature-${index}`}
    >
      <CardContent className="p-6 space-y-4">
        <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center group-hover:bg-secondary/90 transition-colors">
          <Icon className="w-6 h-6 text-primary" />
        </div>

        <h3 className="text-xl font-semibold" data-testid={`text-feature-title-${index}`}>
          {title}
        </h3>

        <p
          className="text-muted-foreground leading-relaxed"
          data-testid={`text-feature-description-${index}`}
        >
          {description}
        </p>
      </CardContent>
    </Card>
  );
}
