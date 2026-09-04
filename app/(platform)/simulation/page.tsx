import { PublishedRoleplayCourses } from "@/components/courses/published-roleplay-courses";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function SimulationPage() {
  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="bg-surface/90">
          <CardHeader>
            <CardDescription>Assigned simulation sessions</CardDescription>
            <CardTitle className="text-3xl">Start a Roleplay Session</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-wrap gap-3">
              <Badge>Assignment based</Badge>
              <Badge variant="secondary">ConvoAI roleplay</Badge>
              <Badge variant="secondary">Final assessment enabled</Badge>
            </div>
            <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
              Choose one of your assigned published roleplay courses below.
              Course admins control access from the Role Play Builder.
            </p>
          </CardContent>
        </Card>

        <Card className="border-panel-border bg-panel text-panel-foreground">
          <CardHeader>
            <CardDescription className="text-subtle-foreground">
              Access model
            </CardDescription>
            <CardTitle className="text-primary-foreground">
              Course assignments
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-subtle-foreground">
            <div className="rounded-2xl bg-surface/10 p-4">
              Trainees only see courses assigned to their logged-in account.
            </div>
            <div className="rounded-2xl bg-surface/10 p-4">
              Admins can publish courses and update assignment access from the
              builder.
            </div>
          </CardContent>
        </Card>
      </section>

      <PublishedRoleplayCourses emptyState />
    </div>
  );
}
