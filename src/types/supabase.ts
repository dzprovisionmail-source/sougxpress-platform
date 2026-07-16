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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          changed_at: string
          event_type: string
          id: number
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
          user_id: string | null
        }
        Insert: {
          changed_at?: string
          event_type: string
          id?: number
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
          user_id?: string | null
        }
        Update: {
          changed_at?: string
          event_type?: string
          id?: number
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      customer_addresses: {
        Row: {
          address_line1: string
          address_line2: string | null
          address_text: string | null
          city: string
          country: string
          created_at: string
          customer_id: string
          id: string
          is_default: boolean
          label: string | null
          latitude: number | null
          longitude: number | null
          postal_code: string | null
          state_province: string | null
          updated_at: string
          zone_id: string | null
        }
        Insert: {
          address_line1: string
          address_line2?: string | null
          address_text?: string | null
          city: string
          country: string
          created_at?: string
          customer_id: string
          id?: string
          is_default?: boolean
          label?: string | null
          latitude?: number | null
          longitude?: number | null
          postal_code?: string | null
          state_province?: string | null
          updated_at?: string
          zone_id?: string | null
        }
        Update: {
          address_line1?: string
          address_line2?: string | null
          address_text?: string | null
          city?: string
          country?: string
          created_at?: string
          customer_id?: string
          id?: string
          is_default?: boolean
          label?: string | null
          latitude?: number | null
          longitude?: number | null
          postal_code?: string | null
          state_province?: string | null
          updated_at?: string
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_addresses_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_customer_addresses_zone"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          created_at: string
          email: string
          first_name: string
          full_name: string | null
          id: string
          last_name: string
          phone: string | null
          phone_number: string
          status: string
          updated_at: string
          zone_id: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          email: string
          first_name: string
          full_name?: string | null
          id: string
          last_name: string
          phone?: string | null
          phone_number: string
          status?: string
          updated_at?: string
          zone_id?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string
          first_name?: string
          full_name?: string | null
          id?: string
          last_name?: string
          phone?: string | null
          phone_number?: string
          status?: string
          updated_at?: string
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_customers_zone"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_assignments: {
        Row: {
          assigned_at: string | null
          created_at: string
          delivered_at: string | null
          driver_id: string | null
          id: string
          order_id: string
          picked_up_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          assigned_at?: string | null
          created_at?: string
          delivered_at?: string | null
          driver_id?: string | null
          id?: string
          order_id: string
          picked_up_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_at?: string | null
          created_at?: string
          delivered_at?: string | null
          driver_id?: string | null
          id?: string
          order_id?: string
          picked_up_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_assignments_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_assignments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_commission_cycles: {
        Row: {
          commission_earned_minor: number
          created_at: string
          cycle_end_date: string | null
          cycle_start_date: string
          deliveries_count: number
          driver_id: string
          id: string
          payment_confirmed_at: string | null
          payment_due_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          commission_earned_minor?: number
          created_at?: string
          cycle_end_date?: string | null
          cycle_start_date?: string
          deliveries_count?: number
          driver_id: string
          id?: string
          payment_confirmed_at?: string | null
          payment_due_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          commission_earned_minor?: number
          created_at?: string
          cycle_end_date?: string | null
          cycle_start_date?: string
          deliveries_count?: number
          driver_id?: string
          id?: string
          payment_confirmed_at?: string | null
          payment_due_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_commission_cycles_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      disputes: {
        Row: {
          created_at: string
          customer_id: string
          description: string | null
          driver_id: string | null
          id: string
          merchant_id: string | null
          order_id: string
          reason: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          description?: string | null
          driver_id?: string | null
          id?: string
          merchant_id?: string | null
          order_id: string
          reason: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          description?: string | null
          driver_id?: string | null
          id?: string
          merchant_id?: string | null
          order_id?: string
          reason?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "disputes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_locations: {
        Row: {
          driver_id: string
          latitude: number
          longitude: number
          updated_at: string
        }
        Insert: {
          driver_id: string
          latitude: number
          longitude: number
          updated_at?: string
        }
        Update: {
          driver_id?: string
          latitude?: number
          longitude?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_locations_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: true
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      drivers: {
        Row: {
          address: string | null
          availability: string
          created_at: string
          email: string
          first_name: string
          full_name: string | null
          id: string
          is_available: boolean
          last_name: string
          license_plate: string | null
          phone: string | null
          phone_number: string
          rating: number | null
          review_count: number | null
          status: string
          updated_at: string
          vehicle_type: string | null
          zone_id: string | null
        }
        Insert: {
          address?: string | null
          availability?: string
          created_at?: string
          email: string
          first_name: string
          full_name?: string | null
          id: string
          is_available?: boolean
          last_name: string
          license_plate?: string | null
          phone?: string | null
          phone_number: string
          rating?: number | null
          review_count?: number | null
          status?: string
          updated_at?: string
          vehicle_type?: string | null
          zone_id?: string | null
        }
        Update: {
          address?: string | null
          availability?: string
          created_at?: string
          email?: string
          first_name?: string
          full_name?: string | null
          id?: string
          is_available?: boolean
          last_name?: string
          license_plate?: string | null
          phone?: string | null
          phone_number?: string
          rating?: number | null
          review_count?: number | null
          status?: string
          updated_at?: string
          vehicle_type?: string | null
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_drivers_zone"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      founder_alerts: {
        Row: {
          alert_type: string
          created_at: string
          id: string
          is_resolved: boolean
          message: string
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          updated_at: string
        }
        Insert: {
          alert_type: string
          created_at?: string
          id?: string
          is_resolved?: boolean
          message: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
          updated_at?: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          id?: string
          is_resolved?: boolean
          message?: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          updated_at?: string
        }
        Relationships: []
      }
      founder_overrides: {
        Row: {
          founder_id: string
          id: string
          new_value: string
          old_value: string | null
          overridden_at: string
          override_field: string
          reason: string
          target_record_id: string | null
          target_table: string
        }
        Insert: {
          founder_id: string
          id?: string
          new_value: string
          old_value?: string | null
          overridden_at?: string
          override_field: string
          reason: string
          target_record_id?: string | null
          target_table: string
        }
        Update: {
          founder_id?: string
          id?: string
          new_value?: string
          old_value?: string | null
          overridden_at?: string
          override_field?: string
          reason?: string
          target_record_id?: string | null
          target_table?: string
        }
        Relationships: []
      }
      merchants: {
        Row: {
          address: string | null
          business_name: string
          commission_rate: number | null
          contact_email: string
          contact_phone: string
          created_at: string
          description: string | null
          email: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          owner_full_name: string | null
          phone: string | null
          status: string
          updated_at: string
          zone_id: string | null
        }
        Insert: {
          address?: string | null
          business_name: string
          commission_rate?: number | null
          contact_email: string
          contact_phone: string
          created_at?: string
          description?: string | null
          email?: string | null
          id: string
          is_active?: boolean
          logo_url?: string | null
          owner_full_name?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
          zone_id?: string | null
        }
        Update: {
          address?: string | null
          business_name?: string
          commission_rate?: number | null
          contact_email?: string
          contact_phone?: string
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          owner_full_name?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_merchants_zone"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          data: Json | null
          delivery_status: string
          id: string
          is_read: boolean
          notification_type: string
          read_at: string | null
          related_entity_id: string | null
          related_entity_type: string | null
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          data?: Json | null
          delivery_status?: string
          id?: string
          is_read?: boolean
          notification_type: string
          read_at?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          title: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          data?: Json | null
          delivery_status?: string
          id?: string
          is_read?: boolean
          notification_type?: string
          read_at?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          price_at_order_minor: number
          product_id: string
          quantity: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          price_at_order_minor: number
          product_id: string
          quantity: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          price_at_order_minor?: number
          product_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          id: string
          order_id: string
          status: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          order_id: string
          status: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          order_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          customer_id: string
          delivery_address_id: string
          delivery_fee_minor: number
          id: string
          order_total_minor: number
          platform_commission_minor: number
          special_instructions: string | null
          status: string
          store_id: string
          updated_at: string
          zone_id: string | null
        }
        Insert: {
          created_at?: string
          customer_id: string
          delivery_address_id: string
          delivery_fee_minor: number
          id?: string
          order_total_minor: number
          platform_commission_minor: number
          special_instructions?: string | null
          status?: string
          store_id: string
          updated_at?: string
          zone_id?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string
          delivery_address_id?: string
          delivery_fee_minor?: number
          id?: string
          order_total_minor?: number
          platform_commission_minor?: number
          special_instructions?: string | null
          status?: string
          store_id?: string
          updated_at?: string
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_orders_zone"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_delivery_address_id_fkey"
            columns: ["delivery_address_id"]
            isOneToOne: false
            referencedRelation: "customer_addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      payouts: {
        Row: {
          amount_minor: number
          created_at: string
          currency: string
          entity_id: string
          entity_type: string
          id: string
          processed_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount_minor: number
          created_at?: string
          currency?: string
          entity_id: string
          entity_type: string
          id?: string
          processed_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount_minor?: number
          created_at?: string
          currency?: string
          entity_id?: string
          entity_type?: string
          id?: string
          processed_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      platform_financial_settings: {
        Row: {
          created_at: string
          description: string | null
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          description?: string | null
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      platform_metrics_snapshots: {
        Row: {
          active_customers: number
          active_drivers: number
          active_merchants: number
          average_delivery_time_minutes: number | null
          completed_deliveries_24h: number
          created_at: string
          id: string
          new_users_24h: number
          snapshot_time: string
          total_orders: number
          total_revenue_minor: number
          updated_at: string
        }
        Insert: {
          active_customers?: number
          active_drivers?: number
          active_merchants?: number
          average_delivery_time_minutes?: number | null
          completed_deliveries_24h?: number
          created_at?: string
          id?: string
          new_users_24h?: number
          snapshot_time?: string
          total_orders?: number
          total_revenue_minor?: number
          updated_at?: string
        }
        Update: {
          active_customers?: number
          active_drivers?: number
          active_merchants?: number
          average_delivery_time_minutes?: number | null
          completed_deliveries_24h?: number
          created_at?: string
          id?: string
          new_users_24h?: number
          snapshot_time?: string
          total_orders?: number
          total_revenue_minor?: number
          updated_at?: string
        }
        Relationships: []
      }
      product_images: {
        Row: {
          created_at: string
          id: string
          image_url: string
          product_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          product_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          product_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_available: boolean
          name: string
          price_minor: number
          status: string
          stock_quantity: number
          store_id: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          name: string
          price_minor: number
          status?: string
          stock_quantity?: number
          store_id: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          name?: string
          price_minor?: number
          status?: string
          stock_quantity?: number
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          role?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      promotion_redemptions: {
        Row: {
          created_at: string
          id: string
          order_id: string | null
          promotion_id: string
          redemption_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_id?: string | null
          promotion_id: string
          redemption_date?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string | null
          promotion_id?: string
          redemption_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotion_redemptions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_redemptions_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
        ]
      }
      promotions: {
        Row: {
          code: string
          created_at: string
          description: string | null
          end_date: string
          id: string
          is_active: boolean
          max_discount_minor: number | null
          min_order_total_minor: number | null
          start_date: string
          type: string
          updated_at: string
          usage_limit: number | null
          usage_limit_per_user: number | null
          value: number
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          end_date: string
          id?: string
          is_active?: boolean
          max_discount_minor?: number | null
          min_order_total_minor?: number | null
          start_date: string
          type: string
          updated_at?: string
          usage_limit?: number | null
          usage_limit_per_user?: number | null
          value: number
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          end_date?: string
          id?: string
          is_active?: boolean
          max_discount_minor?: number | null
          min_order_total_minor?: number | null
          start_date?: string
          type?: string
          updated_at?: string
          usage_limit?: number | null
          usage_limit_per_user?: number | null
          value?: number
        }
        Relationships: []
      }
      stores: {
        Row: {
          address_line1: string
          address_line2: string | null
          category: string
          city: string
          closes_at: string | null
          country: string
          created_at: string
          email: string | null
          id: string
          is_open: boolean
          latitude: number | null
          longitude: number | null
          merchant_id: string
          name: string
          opening_hours: Json | null
          opens_at: string | null
          phone_number: string | null
          postal_code: string | null
          rating: number | null
          review_count: number | null
          state_province: string | null
          status: string
          updated_at: string
          zone_id: string | null
        }
        Insert: {
          address_line1: string
          address_line2?: string | null
          category: string
          city: string
          closes_at?: string | null
          country: string
          created_at?: string
          email?: string | null
          id?: string
          is_open?: boolean
          latitude?: number | null
          longitude?: number | null
          merchant_id: string
          name: string
          opening_hours?: Json | null
          opens_at?: string | null
          phone_number?: string | null
          postal_code?: string | null
          rating?: number | null
          review_count?: number | null
          state_province?: string | null
          status?: string
          updated_at?: string
          zone_id?: string | null
        }
        Update: {
          address_line1?: string
          address_line2?: string | null
          category?: string
          city?: string
          closes_at?: string | null
          country?: string
          created_at?: string
          email?: string | null
          id?: string
          is_open?: boolean
          latitude?: number | null
          longitude?: number | null
          merchant_id?: string
          name?: string
          opening_hours?: Json | null
          opens_at?: string | null
          phone_number?: string | null
          postal_code?: string | null
          rating?: number | null
          review_count?: number | null
          state_province?: string | null
          status?: string
          updated_at?: string
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_stores_zone"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stores_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount_minor: number
          created_at: string
          currency: string
          customer_id: string | null
          driver_id: string | null
          id: string
          merchant_id: string | null
          order_id: string | null
          payment_method: string | null
          status: string
          transaction_ref: string | null
          type: string
          updated_at: string
        }
        Insert: {
          amount_minor: number
          created_at?: string
          currency?: string
          customer_id?: string | null
          driver_id?: string | null
          id?: string
          merchant_id?: string | null
          order_id?: string | null
          payment_method?: string | null
          status?: string
          transaction_ref?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          amount_minor?: number
          created_at?: string
          currency?: string
          customer_id?: string | null
          driver_id?: string | null
          id?: string
          merchant_id?: string | null
          order_id?: string | null
          payment_method?: string | null
          status?: string
          transaction_ref?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      user_devices: {
        Row: {
          created_at: string
          device_name: string | null
          id: string
          is_active: boolean
          last_seen_at: string
          platform: string
          push_token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_name?: string | null
          id?: string
          is_active?: boolean
          last_seen_at?: string
          platform: string
          push_token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_name?: string | null
          id?: string
          is_active?: boolean
          last_seen_at?: string
          platform?: string
          push_token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      zones: {
        Row: {
          boundary: Json | null
          city: string
          country: string
          created_at: string
          id: string
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          boundary?: Json | null
          city: string
          country: string
          created_at?: string
          id?: string
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          boundary?: Json | null
          city?: string
          country?: string
          created_at?: string
          id?: string
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_order_total: {
        Args: { p_order_id: string }
        Returns: {
          delivery_fee_minor: number
          platform_commission_minor: number
          subtotal_minor: number
          total_minor: number
        }[]
      }
      confirm_delivery_payment: {
        Args: { p_admin_user_id: string; p_cycle_id: string }
        Returns: undefined
      }
      create_notification: {
        Args: {
          p_body: string
          p_data?: Json
          p_notification_type: string
          p_related_entity_id?: string
          p_related_entity_type?: string
          p_title: string
          p_user_id: string
        }
        Returns: string
      }
      create_order_transaction: {
        Args: {
          p_amount_minor: number
          p_customer_id: string
          p_driver_id: string
          p_merchant_id: string
          p_order_id: string
          p_payment_method?: string
          p_type: string
        }
        Returns: undefined
      }
      driver_set_availability: {
        Args: { p_availability: string }
        Returns: undefined
      }
      find_available_driver: { Args: { p_zone_id: string }; Returns: string }
      get_delivery_status: { Args: { delivery_id: string }; Returns: string }
      get_order_status: { Args: { order_id: string }; Returns: string }
      get_platform_financial_setting: {
        Args: { setting_key: string }
        Returns: string
      }
      get_user_role: { Args: { user_id: string }; Returns: string }
      increment_delivery_commission_counter: {
        Args: { p_commission_amount_minor: number; p_driver_id: string }
        Returns: undefined
      }
      log_audit_event: {
        Args: {
          p_event_type: string
          p_new_data?: Json
          p_old_data?: Json
          p_record_id?: string
          p_table_name: string
          p_user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
