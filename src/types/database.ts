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
      amenities: {
        Row: {
          id: number
          name_ru: string
          name_uz: string
          slug: string
          sort_order: number
        }
        Insert: {
          id?: never
          name_ru: string
          name_uz: string
          slug: string
          sort_order?: number
        }
        Update: {
          id?: never
          name_ru?: string
          name_uz?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      contact_reveals: {
        Row: {
          id: string
          listing_id: string
          revealed_at: string
          user_id: string
        }
        Insert: {
          id?: string
          listing_id: string
          revealed_at?: string
          user_id: string
        }
        Update: {
          id?: string
          listing_id?: string
          revealed_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_reveals_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_reveals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      districts: {
        Row: {
          id: number
          name_ru: string
          name_uz: string
          region_id: number
          slug: string
          sort_order: number
        }
        Insert: {
          id?: never
          name_ru: string
          name_uz: string
          region_id: number
          slug: string
          sort_order?: number
        }
        Update: {
          id?: never
          name_ru?: string
          name_uz?: string
          region_id?: number
          slug?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "districts_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          listing_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          listing_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          listing_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_amenities: {
        Row: {
          amenity_id: number
          listing_id: string
        }
        Insert: {
          amenity_id: number
          listing_id: string
        }
        Update: {
          amenity_id?: number
          listing_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_amenities_amenity_id_fkey"
            columns: ["amenity_id"]
            isOneToOne: false
            referencedRelation: "amenities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_amenities_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          area_sqm: number | null
          available_from: string | null
          content_language: Database["public"]["Enums"]["content_language"]
          created_at: string
          description: string | null
          expires_at: string | null
          floor: number | null
          id: string
          owner_id: string
          price_amount: number
          price_currency: string
          property_id: string
          rental_period: Database["public"]["Enums"]["rental_period"]
          reveal_count: number
          rooms: number | null
          status: Database["public"]["Enums"]["listing_status"]
          title: string
          total_floors: number | null
          updated_at: string
          view_count: number
        }
        Insert: {
          area_sqm?: number | null
          available_from?: string | null
          content_language: Database["public"]["Enums"]["content_language"]
          created_at?: string
          description?: string | null
          expires_at?: string | null
          floor?: number | null
          id?: string
          owner_id: string
          price_amount: number
          price_currency?: string
          property_id: string
          rental_period?: Database["public"]["Enums"]["rental_period"]
          reveal_count?: number
          rooms?: number | null
          status?: Database["public"]["Enums"]["listing_status"]
          title: string
          total_floors?: number | null
          updated_at?: string
          view_count?: number
        }
        Update: {
          area_sqm?: number | null
          available_from?: string | null
          content_language?: Database["public"]["Enums"]["content_language"]
          created_at?: string
          description?: string | null
          expires_at?: string | null
          floor?: number | null
          id?: string
          owner_id?: string
          price_amount?: number
          price_currency?: string
          property_id?: string
          rental_period?: Database["public"]["Enums"]["rental_period"]
          reveal_count?: number
          rooms?: number | null
          status?: Database["public"]["Enums"]["listing_status"]
          title?: string
          total_floors?: number | null
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "listings_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_with_coords"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          identity_verified: boolean
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          telegram_username: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          identity_verified?: boolean
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          telegram_username?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          identity_verified?: boolean
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          telegram_username?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          address_line: string
          cadastral_number: string | null
          created_at: string
          district_id: number | null
          id: string
          location: unknown
          owner_id: string
          region_id: number
          updated_at: string
          verification_status: Database["public"]["Enums"]["property_verification_status"]
          verified_at: string | null
        }
        Insert: {
          address_line: string
          cadastral_number?: string | null
          created_at?: string
          district_id?: number | null
          id?: string
          location: unknown
          owner_id: string
          region_id: number
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["property_verification_status"]
          verified_at?: string | null
        }
        Update: {
          address_line?: string
          cadastral_number?: string | null
          created_at?: string
          district_id?: number | null
          id?: string
          location?: unknown
          owner_id?: string
          region_id?: number
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["property_verification_status"]
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      property_photos: {
        Row: {
          created_at: string
          display_order: number
          id: string
          phash: string | null
          property_id: string
          storage_path: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          phash?: string | null
          property_id: string
          storage_path: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          phash?: string | null
          property_id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_photos_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_photos_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_with_coords"
            referencedColumns: ["id"]
          },
        ]
      }
      property_verifications: {
        Row: {
          cadastral_number: string
          created_at: string
          decided_at: string | null
          decided_by: string | null
          document_path: string | null
          id: string
          property_id: string
          rejection_note: string | null
          rejection_reason:
            | Database["public"]["Enums"]["verification_rejection_reason"]
            | null
          status: Database["public"]["Enums"]["verification_submission_status"]
          submitted_by: string
        }
        Insert: {
          cadastral_number: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          document_path?: string | null
          id?: string
          property_id: string
          rejection_note?: string | null
          rejection_reason?:
            | Database["public"]["Enums"]["verification_rejection_reason"]
            | null
          status?: Database["public"]["Enums"]["verification_submission_status"]
          submitted_by: string
        }
        Update: {
          cadastral_number?: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          document_path?: string | null
          id?: string
          property_id?: string
          rejection_note?: string | null
          rejection_reason?:
            | Database["public"]["Enums"]["verification_rejection_reason"]
            | null
          status?: Database["public"]["Enums"]["verification_submission_status"]
          submitted_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_verifications_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_verifications_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_verifications_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_with_coords"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_verifications_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      regions: {
        Row: {
          id: number
          name_ru: string
          name_uz: string
          slug: string
          sort_order: number
        }
        Insert: {
          id?: never
          name_ru: string
          name_uz: string
          slug: string
          sort_order?: number
        }
        Update: {
          id?: never
          name_ru?: string
          name_uz?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          listing_id: string
          reason: Database["public"]["Enums"]["report_reason"]
          reporter_id: string | null
          status: Database["public"]["Enums"]["report_status"]
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          listing_id: string
          reason: Database["public"]["Enums"]["report_reason"]
          reporter_id?: string | null
          status?: Database["public"]["Enums"]["report_status"]
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          listing_id?: string
          reason?: Database["public"]["Enums"]["report_reason"]
          reporter_id?: string | null
          status?: Database["public"]["Enums"]["report_status"]
        }
        Relationships: [
          {
            foreignKeyName: "reports_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      properties_with_coords: {
        Row: {
          address_line: string | null
          cadastral_number: string | null
          created_at: string | null
          district_id: number | null
          id: string | null
          latitude: number | null
          longitude: number | null
          owner_id: string | null
          region_id: number | null
          updated_at: string | null
          verification_status:
            | Database["public"]["Enums"]["property_verification_status"]
            | null
          verified_at: string | null
        }
        Insert: {
          address_line?: string | null
          cadastral_number?: string | null
          created_at?: string | null
          district_id?: number | null
          id?: string | null
          latitude?: never
          longitude?: never
          owner_id?: string | null
          region_id?: number | null
          updated_at?: string | null
          verification_status?:
            | Database["public"]["Enums"]["property_verification_status"]
            | null
          verified_at?: string | null
        }
        Update: {
          address_line?: string | null
          cadastral_number?: string | null
          created_at?: string | null
          district_id?: number | null
          id?: string | null
          latitude?: never
          longitude?: never
          owner_id?: string | null
          region_id?: number | null
          updated_at?: string | null
          verification_status?:
            | Database["public"]["Enums"]["property_verification_status"]
            | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      create_listing: {
        Args: {
          p_amenity_ids?: number[]
          p_area_sqm?: number
          p_available_from?: string
          p_content_language: Database["public"]["Enums"]["content_language"]
          p_description?: string
          p_floor?: number
          p_price_amount: number
          p_price_currency?: string
          p_property_id: string
          p_rental_period?: Database["public"]["Enums"]["rental_period"]
          p_rooms?: number
          p_title: string
          p_total_floors?: number
        }
        Returns: string
      }
      create_property: {
        Args: {
          p_address_line: string
          p_district_id: number
          p_latitude: number
          p_longitude: number
          p_region_id: number
        }
        Returns: string
      }
      decide_verification: {
        Args: {
          p_approve: boolean
          p_note?: string
          p_reason?: Database["public"]["Enums"]["verification_rejection_reason"]
          p_verification_id: string
        }
        Returns: string
      }
      get_favorite_cards: {
        Args: never
        Returns: {
          area_sqm: number
          cover_path: string
          created_at: string
          district_id: number
          is_available: boolean
          listing_id: string
          price_amount: number
          price_currency: string
          region_id: number
          rental_period: Database["public"]["Enums"]["rental_period"]
          rooms: number
          title: string
          verification_status: Database["public"]["Enums"]["property_verification_status"]
        }[]
      }
      get_revealed_contact: {
        Args: { p_listing_id: string }
        Returns: {
          full_name: string
          phone: string
          telegram_username: string
        }[]
      }
      increment_listing_view: {
        Args: { p_listing_id: string }
        Returns: undefined
      }
      is_admin: { Args: never; Returns: boolean }
      reorder_property_photos: {
        Args: { p_photo_ids: string[]; p_property_id: string }
        Returns: undefined
      }
      reveal_contact: {
        Args: { p_listing_id: string }
        Returns: {
          full_name: string
          phone: string
          telegram_username: string
        }[]
      }
      search_listings: {
        Args: {
          p_amenity_ids?: number[]
          p_currency?: string
          p_district_id?: number
          p_limit?: number
          p_offset?: number
          p_price_max?: number
          p_price_min?: number
          p_region_id?: number
          p_rental_period?: Database["public"]["Enums"]["rental_period"]
          p_rooms_max?: number
          p_rooms_min?: number
          p_sort?: string
        }
        Returns: {
          area_sqm: number
          cover_path: string
          created_at: string
          district_id: number
          id: string
          price_amount: number
          price_currency: string
          region_id: number
          rental_period: Database["public"]["Enums"]["rental_period"]
          rooms: number
          title: string
          total_count: number
          verification_status: Database["public"]["Enums"]["property_verification_status"]
        }[]
      }
      submit_verification: {
        Args: {
          p_cadastral_number: string
          p_document_path: string
          p_property_id: string
        }
        Returns: string
      }
      update_listing: {
        Args: {
          p_amenity_ids?: number[]
          p_area_sqm?: number
          p_available_from?: string
          p_content_language: Database["public"]["Enums"]["content_language"]
          p_description?: string
          p_floor?: number
          p_id: string
          p_price_amount: number
          p_price_currency?: string
          p_rental_period?: Database["public"]["Enums"]["rental_period"]
          p_rooms?: number
          p_title: string
          p_total_floors?: number
        }
        Returns: undefined
      }
      update_property: {
        Args: {
          p_address_line: string
          p_district_id: number
          p_id: string
          p_latitude: number
          p_longitude: number
          p_region_id: number
        }
        Returns: undefined
      }
    }
    Enums: {
      content_language: "uz" | "ru"
      listing_status: "draft" | "active" | "paused" | "expired" | "removed"
      property_verification_status:
        | "unverified"
        | "pending"
        | "verified"
        | "rejected"
      rental_period: "monthly" | "daily"
      report_reason:
        | "fake_listing"
        | "wrong_price"
        | "already_rented"
        | "scam_attempt"
        | "inappropriate_content"
        | "other"
      report_status: "open" | "reviewing" | "resolved" | "dismissed"
      user_role: "user" | "admin"
      verification_rejection_reason:
        | "name_mismatch"
        | "unreadable"
        | "wrong_document"
        | "cadastral_mismatch"
        | "other"
      verification_submission_status: "pending" | "approved" | "rejected"
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
      content_language: ["uz", "ru"],
      listing_status: ["draft", "active", "paused", "expired", "removed"],
      property_verification_status: [
        "unverified",
        "pending",
        "verified",
        "rejected",
      ],
      rental_period: ["monthly", "daily"],
      report_reason: [
        "fake_listing",
        "wrong_price",
        "already_rented",
        "scam_attempt",
        "inappropriate_content",
        "other",
      ],
      report_status: ["open", "reviewing", "resolved", "dismissed"],
      user_role: ["user", "admin"],
      verification_rejection_reason: [
        "name_mismatch",
        "unreadable",
        "wrong_document",
        "cadastral_mismatch",
        "other",
      ],
      verification_submission_status: ["pending", "approved", "rejected"],
    },
  },
} as const
