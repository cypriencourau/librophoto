import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const runtime = "nodejs"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    // Début du mois
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { count, error } = await supabase
      .from("ocr_usage")
      .select("*", { count: "exact", head: true })
      .gte("created_at", startOfMonth.toISOString())

    if (error) throw error

    return NextResponse.json({
      count: count ?? 0
    })

  } catch (error) {
    console.error("Stats error:", error)
    return NextResponse.json(
      { count: 0 },
      { status: 500 }
    )
  }
}