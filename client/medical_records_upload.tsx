import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { FileText, Upload, Calendar, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export default function MedicalRecords() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: records, isLoading } = useQuery<any[]>({
    queryKey: [api.appointments.medicalRecords.list.path],
    queryFn: async () => {
      const res = await fetch(api.appointments.medicalRecords.list.path, {
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      if (!res.ok) throw new Error('Failed to fetch records');
      return res.json();
    }
  });

  const uploadMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", api.appointments.medicalRecords.upload.path, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.appointments.medicalRecords.list.path] });
      toast({ title: "Success", description: "Medical record uploaded successfully" });
    },
  });

  const filteredRecords = records?.filter(r => 
    r.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.fileType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Layout>
      <div className="p-4 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-xl">
              <FileText className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Medical Records</h1>
              <p className="text-muted-foreground">Securely store and manage your health history</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="file"
              id="file-upload"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                
                const formData = new FormData();
                formData.append('file', file);
                formData.append('fileName', file.name);

                try {
                  const res = await fetch(api.appointments.medicalRecords.upload.path, {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: formData
                  });
                  if (res.ok) {
                    queryClient.invalidateQueries({ queryKey: [api.appointments.medicalRecords.list.path] });
                    toast({ title: "Success", description: "Medical record uploaded successfully" });
                  } else {
                    toast({ title: "Error", description: "Failed to upload record", variant: "destructive" });
                  }
                } catch (err) {
                  toast({ title: "Error", description: "Upload error", variant: "destructive" });
                }
              }}
            />
            <Button onClick={() => document.getElementById('file-upload')?.click()} className="shadow-lg shadow-primary/20">
              <Upload className="w-4 h-4 mr-2" />
              Upload Record
            </Button>
          </div>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search by title or type..." 
            className="pl-10 h-11 bg-card border-border/50"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-muted/50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filteredRecords && filteredRecords.length > 0 ? (
          <div className="grid gap-4">
            {filteredRecords.map((record) => (
              <Card key={record.id} className="hover-elevate transition-all border-border/50 group">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-3 bg-secondary rounded-lg group-hover:bg-primary/10 transition-colors">
                    <FileText className="w-6 h-6 text-muted-foreground group-hover:text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate">{record.fileName}</h3>
                    <p className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                      <span className="capitalize">{record.fileType}</span>
                      <span className="w-1 h-1 rounded-full bg-border" />
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(record.uploadDate), "MMM d, yyyy")}
                      </span>
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/5" onClick={() => window.open(record.filePath, '_blank')}>
                    View
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed border-2 bg-muted/30">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="p-4 bg-background rounded-full mb-4 shadow-sm">
                <FileText className="w-12 h-12 text-muted-foreground/50" />
              </div>
              <CardTitle className="mb-2">No records found</CardTitle>
              <p className="text-muted-foreground max-w-sm">
                Start building your health history by uploading your first medical document.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
