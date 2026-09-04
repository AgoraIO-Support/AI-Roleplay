import { Card, CardContent } from "@/components/ui/card";

type ProfileMetric = {
  label: string;
  value: string;
  helper: string;
};

export function ProfileStats({ metrics }: { metrics: ProfileMetric[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <Card key={metric.label} className="bg-surface/90">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{metric.label}</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
              {metric.value}
            </p>
            <p className="mt-2 text-sm text-primary">{metric.helper}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
