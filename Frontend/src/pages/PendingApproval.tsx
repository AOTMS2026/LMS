import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import logo from '@/assets/aliet_logo.png';
import { Clock, Mail, LogOut, ArrowLeft } from 'lucide-react';

export default function PendingApproval() {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();

    const handleSignOut = async () => {
        await signOut();
        navigate('/auth');
    };

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
            <div className="max-w-md w-full text-center space-y-8">
                <div className="flex justify-center">
                    <img src={logo} alt="AOTMS Logo" className="h-12 lg:h-16" />
                </div>

                <div className="bg-card p-8 rounded-3xl border border-border shadow-xl space-y-6">
                    <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary animate-pulse">
                        <Clock className="h-10 w-10" />
                    </div>

                    <div className="space-y-2">
                        <h1 className="text-2xl font-bold text-foreground">Pending Approval</h1>
                        <p className="text-muted-foreground">
                            Welcome to the AOTMS LMS portal! Your account is currently under review.
                        </p>
                    </div>

                    <div className="p-4 bg-muted/50 rounded-2xl text-sm text-left border border-border">
                        <p className="font-medium text-foreground mb-1 italic">
                            "Please wait, admin must approve your profile and enroll all authorizations."
                        </p>
                        <p className="text-muted-foreground">
                            Once approved, you will receive an email notification and full access to your learning dashboard.
                        </p>
                    </div>

                    <div className="flex items-center gap-2 justify-center text-primary font-medium text-sm">
                        <Mail className="h-4 w-4" />
                        <span>Support: Info@aotms.in</span>
                    </div>

                    <div className="grid grid-cols-1 gap-3 pt-4">
                        <Button
                            variant="outline"
                            className="w-full rounded-xl gap-2"
                            onClick={() => window.location.reload()}
                        >
                            Check Status
                        </Button>
                        <Button
                            variant="ghost"
                            className="w-full rounded-xl gap-2 text-destructive hover:bg-destructive/10"
                            onClick={handleSignOut}
                        >
                            <LogOut className="h-4 w-4" />
                            Sign Out
                        </Button>
                    </div>
                </div>

                <p className="text-xs text-muted-foreground">
                    &copy; 2026 AOTMS Launchpad. All rights reserved.
                </p>
            </div>
        </div>
    );
}
