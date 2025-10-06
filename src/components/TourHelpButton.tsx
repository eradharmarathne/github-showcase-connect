import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTourHelpers } from '@/components/TourManager';
import { HelpCircle, Play, BookOpen, Calendar, DollarSign, Settings, Users, Wifi } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';

export const TourHelpButton: React.FC = () => {
  const {
    startDashboardTour,
    startReservationsTour,
    startFinancialReportsTour,
    startFirstTimeUserTour,
    startCalendarTour,
    startMasterFilesTour,
    startSettingsTour,
    startBookingChannelsTour,
    hasCompletedTour
  } = useTourHelpers();

  const { hasPermission } = usePermissions();

  const tourItems = [
    {
      id: 'first-time-user',
      label: 'Complete App Tour',
      description: 'Full walkthrough of all features',
      icon: <BookOpen className="h-4 w-4" />,
      action: startFirstTimeUserTour,
      show: true
    },
    {
      id: 'dashboard',
      label: 'Dashboard Tour',
      description: 'Overview and navigation',
      icon: <Play className="h-4 w-4" />,
      action: startDashboardTour,
      show: true
    },
    {
      id: 'reservations',
      label: 'Reservations Tour',
      description: 'Booking management',
      icon: <Users className="h-4 w-4" />,
      action: startReservationsTour,
      show: hasPermission('access_bookings')
    },
    {
      id: 'calendar',
      label: 'Calendar Tour',
      description: 'Visual booking calendar',
      icon: <Calendar className="h-4 w-4" />,
      action: startCalendarTour,
      show: hasPermission('access_calendar')
    },
    {
      id: 'financial-reports',
      label: 'Financial Reports Tour',
      description: 'Income and expense tracking',
      icon: <DollarSign className="h-4 w-4" />,
      action: startFinancialReportsTour,
      show: hasPermission('access_reports')
    },
    {
      id: 'master-files',
      label: 'Master Files Tour',
      description: 'Property configuration',
      icon: <Settings className="h-4 w-4" />,
      action: startMasterFilesTour,
      show: hasPermission('access_master_files')
    },
    {
      id: 'booking-channels',
      label: 'Booking Channels Tour',
      description: 'External platform integration',
      icon: <Wifi className="h-4 w-4" />,
      action: startBookingChannelsTour,
      show: hasPermission('access_booking_channels')
    }
  ];

  const availableTours = tourItems.filter(item => item.show);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          title="Help & Tours"
        >
          <HelpCircle className="h-5 w-5" />
          {!hasCompletedTour('first-time-user') && (
            <span className="absolute -top-1 -right-1 h-3 w-3 bg-primary rounded-full animate-pulse" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex items-center gap-2">
          <HelpCircle className="h-4 w-4" />
          App Tours & Help
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {availableTours.map((item) => (
          <DropdownMenuItem
            key={item.id}
            onClick={item.action}
            className="flex items-start gap-3 p-3 cursor-pointer"
          >
            <div className="flex-shrink-0 mt-0.5">
              {item.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{item.label}</span>
                {hasCompletedTour(item.id as any) && (
                  <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                    ✓
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {item.description}
              </p>
            </div>
          </DropdownMenuItem>
        ))}

        {!hasCompletedTour('first-time-user') && (
          <>
            <DropdownMenuSeparator />
            <div className="p-3 bg-blue-50 m-1 rounded-lg">
              <p className="text-xs text-blue-700 font-medium">
                💡 New user? Start with the Complete App Tour!
              </p>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};