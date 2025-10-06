import React, { useEffect, useRef } from 'react';
import Shepherd from 'shepherd.js';
import { useTour, TourType } from '@/context/TourContext';
import { getTourSteps, tourTheme } from '@/lib/tourSteps';
import { useToast } from '@/hooks/use-toast';

interface TourManagerProps {
  children: React.ReactNode;
}

export const TourManager: React.FC<TourManagerProps> = ({ children }) => {
  const { activeTour, endTour, markTourAsCompleted } = useTour();
  const { toast } = useToast();
  const tourInstanceRef = useRef<any | null>(null);

  useEffect(() => {
    if (!activeTour) {
      // Clean up any existing tour
      if (tourInstanceRef.current) {
        tourInstanceRef.current.complete();
        tourInstanceRef.current = null;
      }
      return;
    }

    // Get steps for the current tour
    const steps = getTourSteps(activeTour);
    if (steps.length === 0) {
      console.warn(`No steps found for tour: ${activeTour}`);
      endTour();
      return;
    }

    // Create new tour instance
    const tour = new Shepherd.Tour({
      ...tourTheme,
      confirmCancel: true,
      confirmCancelMessage: 'Are you sure you want to exit the tour?'
    });

    // Add steps to tour
    tour.addSteps(steps);

    // Handle tour completion
    tour.on('complete', () => {
      markTourAsCompleted(activeTour);
      endTour();
      toast({
        title: '🎉 Tour Completed!',
        description: 'Great job! You\'ve completed the tour. You can restart it anytime from the help menu.',
      });
    });

    // Handle tour cancellation
    tour.on('cancel', () => {
      endTour();
      toast({
        title: 'Tour Cancelled',
        description: 'You can restart the tour anytime from the help menu.',
        variant: 'default'
      });
    });

    // Handle individual step events for analytics (optional)
    tour.on('show', (event) => {
      console.log(`Tour step shown: ${event.step?.id} in tour: ${activeTour}`);
    });

    // Start the tour
    tour.start();
    tourInstanceRef.current = tour;

    // Cleanup on unmount or tour change
    return () => {
      if (tourInstanceRef.current) {
        tourInstanceRef.current.complete();
        tourInstanceRef.current = null;
      }
    };
  }, [activeTour, endTour, markTourAsCompleted, toast]);

  return <>{children}</>;
};

// Hook to easily start tours from components
export const useTourHelpers = () => {
  const { startTour, hasCompletedTour } = useTour();

  const startDashboardTour = () => startTour('dashboard');
  const startReservationsTour = () => startTour('reservations');
  const startFinancialReportsTour = () => startTour('financial-reports');
  const startFirstTimeUserTour = () => startTour('first-time-user');
  const startCalendarTour = () => startTour('calendar');
  const startMasterFilesTour = () => startTour('master-files');
  const startSettingsTour = () => startTour('settings');
  const startBookingChannelsTour = () => startTour('booking-channels');

  return {
    startDashboardTour,
    startReservationsTour,
    startFinancialReportsTour,
    startFirstTimeUserTour,
    startCalendarTour,
    startMasterFilesTour,
    startSettingsTour,
    startBookingChannelsTour,
    hasCompletedTour
  };
};