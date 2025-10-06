export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      account_transfers: {
        Row: {
          amount: number
          conversion_rate: number
          created_at: string
          from_account_id: string
          id: string
          note: string | null
          tenant_id: string | null
          to_account_id: string
        }
        Insert: {
          amount: number
          conversion_rate?: number
          created_at?: string
          from_account_id: string
          id?: string
          note?: string | null
          tenant_id?: string | null
          to_account_id: string
        }
        Update: {
          amount?: number
          conversion_rate?: number
          created_at?: string
          from_account_id?: string
          id?: string
          note?: string | null
          tenant_id?: string | null
          to_account_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_transfers_from_account_id_fkey"
            columns: ["from_account_id"]
            isOneToOne: false
            referencedRelation: "account_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_transfers_from_account_id_fkey"
            columns: ["from_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_transfers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_transfers_to_account_id_fkey"
            columns: ["to_account_id"]
            isOneToOne: false
            referencedRelation: "account_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_transfers_to_account_id_fkey"
            columns: ["to_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts: {
        Row: {
          created_at: string
          currency: Database["public"]["Enums"]["currency_type"]
          current_balance: number
          id: string
          initial_balance: number
          location_access: string[]
          name: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_type"]
          current_balance?: number
          id?: string
          initial_balance?: number
          location_access?: string[]
          name: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_type"]
          current_balance?: number
          id?: string
          initial_balance?: number
          location_access?: string[]
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      additional_services: {
        Row: {
          created_at: string
          created_by: string | null
          currency: Database["public"]["Enums"]["currency_type"]
          id: string
          notes: string | null
          quantity: number
          reservation_id: string
          service_date: string
          service_name: string
          service_type: string
          tenant_id: string | null
          total_amount: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          currency?: Database["public"]["Enums"]["currency_type"]
          id?: string
          notes?: string | null
          quantity?: number
          reservation_id: string
          service_date?: string
          service_name: string
          service_type: string
          tenant_id?: string | null
          total_amount: number
          unit_price: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          currency?: Database["public"]["Enums"]["currency_type"]
          id?: string
          notes?: string | null
          quantity?: number
          reservation_id?: string
          service_date?: string
          service_name?: string
          service_type?: string
          tenant_id?: string | null
          total_amount?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "additional_services_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservation_financials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "additional_services_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "additional_services_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      agents: {
        Row: {
          agency_name: string | null
          commission_rate: number
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          phone: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          agency_name?: string | null
          commission_rate?: number
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          phone?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          agency_name?: string | null
          commission_rate?: number
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          phone?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      beds24_property_mappings: {
        Row: {
          beds24_property_id: string
          beds24_property_name: string
          created_at: string
          id: string
          is_active: boolean
          location_id: string
          mapping_type: string
          room_id: string | null
          updated_at: string
        }
        Insert: {
          beds24_property_id: string
          beds24_property_name: string
          created_at?: string
          id?: string
          is_active?: boolean
          location_id: string
          mapping_type: string
          room_id?: string | null
          updated_at?: string
        }
        Update: {
          beds24_property_id?: string
          beds24_property_name?: string
          created_at?: string
          id?: string
          is_active?: boolean
          location_id?: string
          mapping_type?: string
          room_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "beds24_property_mappings_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beds24_property_mappings_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_payments: {
        Row: {
          account_id: string
          amount: number
          booking_id: string
          created_at: string
          currency: Database["public"]["Enums"]["currency_type"]
          id: string
          is_advance: boolean
          note: string | null
          payment_method: string
        }
        Insert: {
          account_id: string
          amount: number
          booking_id: string
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_type"]
          id?: string
          is_advance?: boolean
          note?: string | null
          payment_method: string
        }
        Update: {
          account_id?: string
          amount?: number
          booking_id?: string
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_type"]
          id?: string
          is_advance?: boolean
          note?: string | null
          payment_method?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_payments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "account_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_payments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_sync_urls: {
        Row: {
          created_at: string
          ical_url: string
          id: string
          last_synced_at: string | null
          location_id: string
          source: string
        }
        Insert: {
          created_at?: string
          ical_url: string
          id?: string
          last_synced_at?: string | null
          location_id: string
          source: string
        }
        Update: {
          created_at?: string
          ical_url?: string
          id?: string
          last_synced_at?: string | null
          location_id?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_sync_urls_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          advance_amount: number
          check_in: string
          check_out: string
          created_at: string
          guest_name: string
          id: string
          location_id: string
          paid_amount: number
          room_id: string | null
          source: Database["public"]["Enums"]["booking_source"]
          status: Database["public"]["Enums"]["booking_status"]
          total_amount: number
        }
        Insert: {
          advance_amount?: number
          check_in: string
          check_out: string
          created_at?: string
          guest_name: string
          id?: string
          location_id: string
          paid_amount?: number
          room_id?: string | null
          source: Database["public"]["Enums"]["booking_source"]
          status?: Database["public"]["Enums"]["booking_status"]
          total_amount: number
        }
        Update: {
          advance_amount?: number
          check_in?: string
          check_out?: string
          created_at?: string
          guest_name?: string
          id?: string
          location_id?: string
          paid_amount?: number
          room_id?: string | null
          source?: Database["public"]["Enums"]["booking_source"]
          status?: Database["public"]["Enums"]["booking_status"]
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "bookings_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_property_mappings: {
        Row: {
          channel_property_name: string
          channel_type: string
          created_at: string
          id: string
          is_active: boolean
          location_id: string
          mapping_type: string
          updated_at: string
        }
        Insert: {
          channel_property_name: string
          channel_type?: string
          created_at?: string
          id?: string
          is_active?: boolean
          location_id: string
          mapping_type?: string
          updated_at?: string
        }
        Update: {
          channel_property_name?: string
          channel_type?: string
          created_at?: string
          id?: string
          is_active?: boolean
          location_id?: string
          mapping_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_property_mappings_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      currency_rates: {
        Row: {
          created_at: string
          currency_code: string | null
          from_currency: Database["public"]["Enums"]["currency_type"] | null
          id: string
          is_custom: boolean | null
          location_id: string
          rate: number | null
          tenant_id: string
          to_currency: Database["public"]["Enums"]["currency_type"] | null
          updated_at: string
          usd_rate: number | null
        }
        Insert: {
          created_at?: string
          currency_code?: string | null
          from_currency?: Database["public"]["Enums"]["currency_type"] | null
          id?: string
          is_custom?: boolean | null
          location_id: string
          rate?: number | null
          tenant_id: string
          to_currency?: Database["public"]["Enums"]["currency_type"] | null
          updated_at?: string
          usd_rate?: number | null
        }
        Update: {
          created_at?: string
          currency_code?: string | null
          from_currency?: Database["public"]["Enums"]["currency_type"] | null
          id?: string
          is_custom?: boolean | null
          location_id?: string
          rate?: number | null
          tenant_id?: string
          to_currency?: Database["public"]["Enums"]["currency_type"] | null
          updated_at?: string
          usd_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_currency_rates_location"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_currency_rates_tenant"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_types: {
        Row: {
          created_at: string
          id: string
          main_type: string
          sub_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          main_type: string
          sub_type: string
        }
        Update: {
          created_at?: string
          id?: string
          main_type?: string
          sub_type?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          account_id: string
          amount: number
          created_at: string
          currency: Database["public"]["Enums"]["currency_type"]
          date: string
          id: string
          location_id: string
          main_type: string
          note: string | null
          sub_type: string
        }
        Insert: {
          account_id: string
          amount: number
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_type"]
          date?: string
          id?: string
          location_id: string
          main_type: string
          note?: string | null
          sub_type: string
        }
        Update: {
          account_id?: string
          amount?: number
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_type"]
          date?: string
          id?: string
          location_id?: string
          main_type?: string
          note?: string | null
          sub_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "account_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      external_bookings: {
        Row: {
          adults: number | null
          check_in: string
          check_out: string
          children: number | null
          created_at: string
          currency: string | null
          external_id: string
          guest_name: string
          id: string
          last_synced_at: string | null
          location_id: string | null
          property_id: string
          raw_data: Json | null
          room_name: string | null
          source: string
          status: string
          total_amount: number | null
          updated_at: string
        }
        Insert: {
          adults?: number | null
          check_in: string
          check_out: string
          children?: number | null
          created_at?: string
          currency?: string | null
          external_id: string
          guest_name: string
          id?: string
          last_synced_at?: string | null
          location_id?: string | null
          property_id: string
          raw_data?: Json | null
          room_name?: string | null
          source: string
          status: string
          total_amount?: number | null
          updated_at?: string
        }
        Update: {
          adults?: number | null
          check_in?: string
          check_out?: string
          children?: number | null
          created_at?: string
          currency?: string | null
          external_id?: string
          guest_name?: string
          id?: string
          last_synced_at?: string | null
          location_id?: string | null
          property_id?: string
          raw_data?: Json | null
          room_name?: string | null
          source?: string
          status?: string
          total_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "external_bookings_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      form_field_preferences: {
        Row: {
          created_at: string | null
          id: string
          show_adults: boolean | null
          show_advance_amount: boolean | null
          show_agent: boolean | null
          show_arrival_time: boolean | null
          show_booking_source: boolean | null
          show_children: boolean | null
          show_guest_address: boolean | null
          show_guest_email: boolean | null
          show_guest_id_number: boolean | null
          show_guest_nationality: boolean | null
          show_guest_passport_number: boolean | null
          show_guest_phone: boolean | null
          show_guest_signature: boolean | null
          show_guide: boolean | null
          show_id_photos: boolean | null
          show_paid_amount: boolean | null
          show_special_requests: boolean | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          show_adults?: boolean | null
          show_advance_amount?: boolean | null
          show_agent?: boolean | null
          show_arrival_time?: boolean | null
          show_booking_source?: boolean | null
          show_children?: boolean | null
          show_guest_address?: boolean | null
          show_guest_email?: boolean | null
          show_guest_id_number?: boolean | null
          show_guest_nationality?: boolean | null
          show_guest_passport_number?: boolean | null
          show_guest_phone?: boolean | null
          show_guest_signature?: boolean | null
          show_guide?: boolean | null
          show_id_photos?: boolean | null
          show_paid_amount?: boolean | null
          show_special_requests?: boolean | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          show_adults?: boolean | null
          show_advance_amount?: boolean | null
          show_agent?: boolean | null
          show_arrival_time?: boolean | null
          show_booking_source?: boolean | null
          show_children?: boolean | null
          show_guest_address?: boolean | null
          show_guest_email?: boolean | null
          show_guest_id_number?: boolean | null
          show_guest_nationality?: boolean | null
          show_guest_passport_number?: boolean | null
          show_guest_phone?: boolean | null
          show_guest_signature?: boolean | null
          show_guide?: boolean | null
          show_id_photos?: boolean | null
          show_paid_amount?: boolean | null
          show_special_requests?: boolean | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_field_preferences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      guides: {
        Row: {
          address: string | null
          commission_rate: number
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          license_number: string | null
          name: string
          notes: string | null
          phone: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          commission_rate?: number
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          license_number?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          commission_rate?: number
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          license_number?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guides_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      income: {
        Row: {
          account_id: string | null
          additional_service_id: string | null
          amount: number
          booking_id: string | null
          booking_source: string | null
          check_in_date: string | null
          check_out_date: string | null
          created_at: string
          currency: Database["public"]["Enums"]["currency_type"]
          date: string
          id: string
          income_type_id: string | null
          is_advance: boolean
          location_id: string
          note: string | null
          payment_method: string
          tenant_id: string | null
          type: Database["public"]["Enums"]["income_type"]
        }
        Insert: {
          account_id?: string | null
          additional_service_id?: string | null
          amount: number
          booking_id?: string | null
          booking_source?: string | null
          check_in_date?: string | null
          check_out_date?: string | null
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_type"]
          date?: string
          id?: string
          income_type_id?: string | null
          is_advance?: boolean
          location_id: string
          note?: string | null
          payment_method: string
          tenant_id?: string | null
          type: Database["public"]["Enums"]["income_type"]
        }
        Update: {
          account_id?: string | null
          additional_service_id?: string | null
          amount?: number
          booking_id?: string | null
          booking_source?: string | null
          check_in_date?: string | null
          check_out_date?: string | null
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_type"]
          date?: string
          id?: string
          income_type_id?: string | null
          is_advance?: boolean
          location_id?: string
          note?: string | null
          payment_method?: string
          tenant_id?: string | null
          type?: Database["public"]["Enums"]["income_type"]
        }
        Relationships: [
          {
            foreignKeyName: "income_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "account_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "income_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "income_additional_service_id_fkey"
            columns: ["additional_service_id"]
            isOneToOne: false
            referencedRelation: "additional_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "income_income_type_id_fkey"
            columns: ["income_type_id"]
            isOneToOne: false
            referencedRelation: "income_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "income_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "income_reservation_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "reservation_financials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "income_reservation_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "income_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      income_types: {
        Row: {
          created_at: string | null
          id: string
          tenant_id: string | null
          type_name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          tenant_id?: string | null
          type_name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          tenant_id?: string | null
          type_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "income_types_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_cents: number
          created_at: string | null
          creem_invoice_id: string | null
          currency: string
          description: string | null
          due_date: string | null
          id: string
          invoice_number: string | null
          paid_at: string | null
          status: string
          subscription_id: string | null
          tenant_id: string | null
        }
        Insert: {
          amount_cents: number
          created_at?: string | null
          creem_invoice_id?: string | null
          currency?: string
          description?: string | null
          due_date?: string | null
          id?: string
          invoice_number?: string | null
          paid_at?: string | null
          status?: string
          subscription_id?: string | null
          tenant_id?: string | null
        }
        Update: {
          amount_cents?: number
          created_at?: string | null
          creem_invoice_id?: string | null
          currency?: string
          description?: string | null
          due_date?: string | null
          id?: string
          invoice_number?: string | null
          paid_at?: string | null
          status?: string
          subscription_id?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          name: string
          phone: string | null
          property_type: string | null
          tenant_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          property_type?: string | null
          tenant_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          property_type?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "locations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_rent_payments: {
        Row: {
          account_id: string
          amount: number
          created_at: string
          id: string
          location_id: string
          month: number
          year: number
        }
        Insert: {
          account_id: string
          amount: number
          created_at?: string
          id?: string
          location_id: string
          month: number
          year: number
        }
        Update: {
          account_id?: string
          amount?: number
          created_at?: string
          id?: string
          location_id?: string
          month?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "monthly_rent_payments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "account_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monthly_rent_payments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monthly_rent_payments_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          account_id: string
          amount: number
          created_at: string
          created_by: string | null
          currency: Database["public"]["Enums"]["currency_type"]
          id: string
          notes: string | null
          payment_method: string
          payment_number: string
          payment_type: string
          reference_number: string | null
          reservation_id: string
        }
        Insert: {
          account_id: string
          amount: number
          created_at?: string
          created_by?: string | null
          currency?: Database["public"]["Enums"]["currency_type"]
          id?: string
          notes?: string | null
          payment_method: string
          payment_number: string
          payment_type: string
          reference_number?: string | null
          reservation_id: string
        }
        Update: {
          account_id?: string
          amount?: number
          created_at?: string
          created_by?: string | null
          currency?: Database["public"]["Enums"]["currency_type"]
          id?: string
          notes?: string | null
          payment_method?: string
          payment_number?: string
          payment_type?: string
          reference_number?: string | null
          reservation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "account_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservation_financials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          billing_interval: string
          created_at: string | null
          currency: string
          description: string | null
          feature_list: string[] | null
          features: Json | null
          id: string
          is_active: boolean | null
          max_locations: number | null
          max_rooms: number | null
          name: string
          price_cents: number
          product_id: string | null
        }
        Insert: {
          billing_interval?: string
          created_at?: string | null
          currency?: string
          description?: string | null
          feature_list?: string[] | null
          features?: Json | null
          id: string
          is_active?: boolean | null
          max_locations?: number | null
          max_rooms?: number | null
          name: string
          price_cents: number
          product_id?: string | null
        }
        Update: {
          billing_interval?: string
          created_at?: string | null
          currency?: string
          description?: string | null
          feature_list?: string[] | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          max_locations?: number | null
          max_rooms?: number | null
          name?: string
          price_cents?: number
          product_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          first_login_completed: boolean
          id: string
          is_phone_verified: boolean
          is_tenant_admin: boolean | null
          last_sign_in_at: string | null
          name: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          tenant_id: string | null
          tenant_role: Database["public"]["Enums"]["tenant_role"] | null
          verification_code: string | null
          verification_code_expires: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          first_login_completed?: boolean
          id: string
          is_phone_verified?: boolean
          is_tenant_admin?: boolean | null
          last_sign_in_at?: string | null
          name: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          tenant_id?: string | null
          tenant_role?: Database["public"]["Enums"]["tenant_role"] | null
          verification_code?: string | null
          verification_code_expires?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          first_login_completed?: boolean
          id?: string
          is_phone_verified?: boolean
          is_tenant_admin?: boolean | null
          last_sign_in_at?: string | null
          name?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          tenant_id?: string | null
          tenant_role?: Database["public"]["Enums"]["tenant_role"] | null
          verification_code?: string | null
          verification_code_expires?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          adults: number
          advance_amount: number | null
          agent_commission: number | null
          agent_id: string | null
          arrival_time: string | null
          balance_amount: number | null
          booking_group_id: string | null
          booking_source: string | null
          check_in_date: string
          check_out_date: string
          children: number
          created_at: string
          created_by: string | null
          currency: Database["public"]["Enums"]["currency_type"]
          grc_approved: boolean | null
          grc_approved_at: string | null
          grc_approved_by: string | null
          guest_address: string | null
          guest_email: string | null
          guest_id_number: string | null
          guest_name: string
          guest_nationality: string | null
          guest_passport_number: string | null
          guest_phone: string | null
          guide_commission: number | null
          guide_id: string | null
          id: string
          location_id: string
          nights: number
          paid_amount: number | null
          reservation_number: string
          room_id: string
          room_rate: number
          special_requests: string | null
          status: Database["public"]["Enums"]["reservation_status"]
          tenant_id: string | null
          total_amount: number
          updated_at: string
        }
        Insert: {
          adults?: number
          advance_amount?: number | null
          agent_commission?: number | null
          agent_id?: string | null
          arrival_time?: string | null
          balance_amount?: number | null
          booking_group_id?: string | null
          booking_source?: string | null
          check_in_date: string
          check_out_date: string
          children?: number
          created_at?: string
          created_by?: string | null
          currency?: Database["public"]["Enums"]["currency_type"]
          grc_approved?: boolean | null
          grc_approved_at?: string | null
          grc_approved_by?: string | null
          guest_address?: string | null
          guest_email?: string | null
          guest_id_number?: string | null
          guest_name: string
          guest_nationality?: string | null
          guest_passport_number?: string | null
          guest_phone?: string | null
          guide_commission?: number | null
          guide_id?: string | null
          id?: string
          location_id: string
          nights: number
          paid_amount?: number | null
          reservation_number: string
          room_id: string
          room_rate: number
          special_requests?: string | null
          status?: Database["public"]["Enums"]["reservation_status"]
          tenant_id?: string | null
          total_amount: number
          updated_at?: string
        }
        Update: {
          adults?: number
          advance_amount?: number | null
          agent_commission?: number | null
          agent_id?: string | null
          arrival_time?: string | null
          balance_amount?: number | null
          booking_group_id?: string | null
          booking_source?: string | null
          check_in_date?: string
          check_out_date?: string
          children?: number
          created_at?: string
          created_by?: string | null
          currency?: Database["public"]["Enums"]["currency_type"]
          grc_approved?: boolean | null
          grc_approved_at?: string | null
          grc_approved_by?: string | null
          guest_address?: string | null
          guest_email?: string | null
          guest_id_number?: string | null
          guest_name?: string
          guest_nationality?: string | null
          guest_passport_number?: string | null
          guest_phone?: string | null
          guide_commission?: number | null
          guide_id?: string | null
          id?: string
          location_id?: string
          nights?: number
          paid_amount?: number | null
          reservation_number?: string
          room_id?: string
          room_rate?: number
          special_requests?: string | null
          status?: Database["public"]["Enums"]["reservation_status"]
          tenant_id?: string | null
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservations_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_guide_id_fkey"
            columns: ["guide_id"]
            isOneToOne: false
            referencedRelation: "guides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      room_pricing: {
        Row: {
          created_at: string
          date: string
          id: string
          is_available: boolean
          price: number
          room_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          is_available?: boolean
          price: number
          room_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          is_available?: boolean
          price?: number
          room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_pricing_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          amenities: string[] | null
          base_price: number
          bed_type: string
          created_at: string
          currency: Database["public"]["Enums"]["currency_type"]
          description: string | null
          id: string
          is_active: boolean
          location_id: string
          max_occupancy: number
          property_type: string
          room_number: string
          room_type: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amenities?: string[] | null
          base_price?: number
          bed_type: string
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_type"]
          description?: string | null
          id?: string
          is_active?: boolean
          location_id: string
          max_occupancy?: number
          property_type?: string
          room_number: string
          room_type: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amenities?: string[] | null
          base_price?: number
          bed_type?: string
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_type"]
          description?: string | null
          id?: string
          is_active?: boolean
          location_id?: string
          max_occupancy?: number
          property_type?: string
          room_number?: string
          room_type?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rooms_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rooms_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancelled_at: string | null
          created_at: string | null
          creem_customer_id: string | null
          creem_subscription_id: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan_id: string | null
          status: string
          tenant_id: string | null
          trial_end: string | null
          trial_end_date: string | null
          trial_start_date: string | null
          updated_at: string | null
        }
        Insert: {
          cancelled_at?: string | null
          created_at?: string | null
          creem_customer_id?: string | null
          creem_subscription_id?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id?: string | null
          status?: string
          tenant_id?: string | null
          trial_end?: string | null
          trial_end_date?: string | null
          trial_start_date?: string | null
          updated_at?: string | null
        }
        Update: {
          cancelled_at?: string | null
          created_at?: string | null
          creem_customer_id?: string | null
          creem_subscription_id?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id?: string | null
          status?: string
          tenant_id?: string | null
          trial_end?: string | null
          trial_end_date?: string | null
          trial_start_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_limits: {
        Row: {
          custom_features: Json | null
          max_locations: number | null
          max_rooms: number | null
          notes: string | null
          tenant_id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          custom_features?: Json | null
          max_locations?: number | null
          max_rooms?: number | null
          notes?: string | null
          tenant_id: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          custom_features?: Json | null
          max_locations?: number | null
          max_rooms?: number | null
          notes?: string | null
          tenant_id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_limits_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_limits_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string | null
          hotel_address: string | null
          hotel_email: string | null
          hotel_name: string | null
          hotel_phone: string | null
          hotel_timezone: string | null
          hotel_website: string | null
          id: string
          logo_url: string | null
          name: string
          onboarding_completed: boolean | null
          owner_profile_id: string | null
          slug: string
          subscription_status: string | null
          trial_ends_at: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          hotel_address?: string | null
          hotel_email?: string | null
          hotel_name?: string | null
          hotel_phone?: string | null
          hotel_timezone?: string | null
          hotel_website?: string | null
          id?: string
          logo_url?: string | null
          name: string
          onboarding_completed?: boolean | null
          owner_profile_id?: string | null
          slug: string
          subscription_status?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          hotel_address?: string | null
          hotel_email?: string | null
          hotel_name?: string | null
          hotel_phone?: string | null
          hotel_timezone?: string | null
          hotel_website?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          onboarding_completed?: boolean | null
          owner_profile_id?: string | null
          slug?: string
          subscription_status?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenants_owner_profile_id_fkey"
            columns: ["owner_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string | null
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          location_id: string | null
          permissions: Json | null
          role: string
          tenant_id: string | null
          token: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string | null
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          location_id?: string | null
          permissions?: Json | null
          role?: string
          tenant_id?: string | null
          token: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          location_id?: string | null
          permissions?: Json | null
          role?: string
          tenant_id?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_invitations_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_invitations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_invitations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permissions: {
        Row: {
          access_accounts: boolean
          access_booking_channels: boolean
          access_bookings: boolean
          access_calendar: boolean
          access_dashboard: boolean
          access_expenses: boolean
          access_income: boolean
          access_master_files: boolean
          access_reports: boolean
          access_rooms: boolean
          access_settings: boolean
          access_users: boolean
          created_at: string
          id: string
          is_tenant_admin: boolean | null
          location_id: string
          tenant_id: string | null
          tenant_role: Database["public"]["Enums"]["tenant_role"] | null
          user_id: string
        }
        Insert: {
          access_accounts?: boolean
          access_booking_channels?: boolean
          access_bookings?: boolean
          access_calendar?: boolean
          access_dashboard?: boolean
          access_expenses?: boolean
          access_income?: boolean
          access_master_files?: boolean
          access_reports?: boolean
          access_rooms?: boolean
          access_settings?: boolean
          access_users?: boolean
          created_at?: string
          id?: string
          is_tenant_admin?: boolean | null
          location_id: string
          tenant_id?: string | null
          tenant_role?: Database["public"]["Enums"]["tenant_role"] | null
          user_id: string
        }
        Update: {
          access_accounts?: boolean
          access_booking_channels?: boolean
          access_bookings?: boolean
          access_calendar?: boolean
          access_dashboard?: boolean
          access_expenses?: boolean
          access_income?: boolean
          access_master_files?: boolean
          access_reports?: boolean
          access_rooms?: boolean
          access_settings?: boolean
          access_users?: boolean
          created_at?: string
          id?: string
          is_tenant_admin?: boolean | null
          location_id?: string
          tenant_id?: string | null
          tenant_role?: Database["public"]["Enums"]["tenant_role"] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permissions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_permissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      account_balances: {
        Row: {
          created_at: string | null
          currency: Database["public"]["Enums"]["currency_type"] | null
          current_balance: number | null
          id: string | null
          initial_balance: number | null
          location_access: string[] | null
          name: string | null
          tenant_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      reservation_financials: {
        Row: {
          balance_amount_original: number | null
          expenses_usd: number | null
          guest_name: string | null
          id: string | null
          needs_to_pay_usd: number | null
          original_currency: Database["public"]["Enums"]["currency_type"] | null
          paid_amount_original: number | null
          reservation_number: string | null
          room_amount_original: number | null
          room_amount_usd: number | null
          status: Database["public"]["Enums"]["reservation_status"] | null
          total_amount_original: number | null
          user_paid_amount_usd: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_invitation: {
        Args: { p_token: string }
        Returns: Json
      }
      clear_location_bookings: {
        Args: { p_location_id: string }
        Returns: Json
      }
      convert_currency: {
        Args: {
          amount_to_convert: number
          from_currency_code: string
          to_currency_code: string
        }
        Returns: number
      }
      create_user_invitation: {
        Args: { p_email: string; p_role?: string; p_tenant_id: string }
        Returns: string
      }
      fix_all_reservation_balances: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      fix_reservation_balance: {
        Args: { reservation_uuid: string }
        Returns: string
      }
      generate_invitation_token: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_invoice_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_payment_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_reservation_number: {
        Args: { p_tenant_id: string }
        Returns: string
      }
      generate_tenant_slug: {
        Args: { hotel_name: string }
        Returns: string
      }
      generate_unique_tenant_slug: {
        Args: { p_name: string }
        Returns: string
      }
      get_account_balances: {
        Args: { p_location_ids: string[]; p_tenant_id: string }
        Returns: {
          currency: Database["public"]["Enums"]["currency_type"]
          current_balance: number
          id: string
          initial_balance: number
          location_access: string[]
          name: string
        }[]
      }
      get_accounts_by_location: {
        Args: { location_id_param: string; tenant_id_param: string }
        Returns: {
          created_at: string
          currency: Database["public"]["Enums"]["currency_type"]
          current_balance: number
          id: string
          initial_balance: number
          location_access: string[]
          name: string
          tenant_id: string
        }[]
      }
      get_tenant_limits: {
        Args: { tenant_id_param: string }
        Returns: Json
      }
      get_user_locations: {
        Args: { p_user_id: string }
        Returns: {
          location_id: string
          location_name: string
          permissions: Json
          tenant_id: string
        }[]
      }
      get_user_permissions: {
        Args: { user_id: string }
        Returns: {
          has_permission: boolean
          is_tenant_admin: boolean
          permission_name: string
          tenant_id: string
          tenant_role: string
        }[]
      }
      get_user_tenant_id: {
        Args: { user_id: string }
        Returns: string
      }
      has_location_access: {
        Args: { location_id: string; user_id: string }
        Returns: boolean
      }
      has_tenant_access: {
        Args: { tenant_id: string; user_id: string }
        Returns: boolean
      }
      invite_user_to_location: {
        Args: {
          p_email: string
          p_invited_by: string
          p_location_id: string
          p_permissions?: Json
          p_role?: string
          p_tenant_id: string
        }
        Returns: Json
      }
      is_tenant_admin: {
        Args: { user_id: string }
        Returns: boolean
      }
      update_account_balance: {
        Args: { account_id_param: string }
        Returns: undefined
      }
      update_user_permissions: {
        Args: { p_permissions: Json; p_tenant_id: string; p_user_id: string }
        Returns: Json
      }
      update_user_profile: {
        Args: {
          p_is_tenant_admin: boolean
          p_name: string
          p_tenant_id: string
          p_tenant_role: Database["public"]["Enums"]["tenant_role"]
          p_user_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      booking_source:
        | "direct"
        | "airbnb"
        | "booking_com"
        | "expedia"
        | "agoda"
        | "beds24"
        | "manual"
        | "online"
        | "phone"
        | "email"
        | "walk_in"
        | "ical"
      booking_status:
        | "pending"
        | "confirmed"
        | "checked_in"
        | "checked_out"
        | "cancelled"
      currency_type: "LKR" | "USD" | "EUR" | "GBP"
      income_type: "booking" | "service" | "other"
      reservation_status:
        | "tentative"
        | "confirmed"
        | "checked_in"
        | "checked_out"
        | "cancelled"
        | "pending"
      tenant_role:
        | "tenant_admin"
        | "tenant_billing"
        | "tenant_manager"
        | "tenant_staff"
      user_role: "admin" | "manager" | "staff"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      booking_source: [
        "direct",
        "airbnb",
        "booking_com",
        "expedia",
        "agoda",
        "beds24",
        "manual",
        "online",
        "phone",
        "email",
        "walk_in",
        "ical",
      ],
      booking_status: [
        "pending",
        "confirmed",
        "checked_in",
        "checked_out",
        "cancelled",
      ],
      currency_type: ["LKR", "USD", "EUR", "GBP"],
      income_type: ["booking", "service", "other"],
      reservation_status: [
        "tentative",
        "confirmed",
        "checked_in",
        "checked_out",
        "cancelled",
        "pending",
      ],
      tenant_role: [
        "tenant_admin",
        "tenant_billing",
        "tenant_manager",
        "tenant_staff",
      ],
      user_role: ["admin", "manager", "staff"],
    },
  },
} as const
