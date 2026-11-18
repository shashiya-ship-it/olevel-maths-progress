
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const secretKey = process.env.SUPABASE_SECRET_KEY;

    if (!supabaseUrl || !publishableKey || !secretKey) {
      console.error("Missing environment variables");

      return NextResponse.json(
        { error: "Server environment variables are missing." },
        { status: 500 }
      );
    }

    // Verify logged-in user
    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Please log in first." },
        { status: 401 }
      );
    }

    const token = authorization.substring(7);

    const authClient = createClient(supabaseUrl, publishableKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data: userData, error: userError } =
      await authClient.auth.getUser(token);

    if (userError || !userData.user) {
      console.error("USER AUTH ERROR:", userError);

      return NextResponse.json(
        { error: "Invalid login session." },
        { status: 401 }
      );
    }

    // Create admin client
    const adminClient = createClient(supabaseUrl, secretKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // Check admin profile
    const { data: profile, error: profileError } =
      await adminClient
        .from("profiles")
        .select("id, full_name, role")
        .eq("id", userData.user.id)
        .single();

    // Debug information
    console.log(
      "ADMIN CHECK:",
      userData.user.id,
      profile,
      profileError
    );

    if (profileError || profile?.role !== "admin") {
      return NextResponse.json(
        {
          error: "Admin verification failed.",
          details: profileError?.message || "User is not an admin.",
        },
        { status: 403 }
      );
    }

    // Get student details
    const body = await request.json();

    const full_name = String(body.full_name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!full_name || !email || !password) {
      return NextResponse.json(
        { error: "Please fill in all fields." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must contain at least 8 characters." },
        { status: 400 }
      );
    }

    // Create student authentication account
    const { data: newUser, error: createError } =
      await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (createError || !newUser.user) {
      console.error("STUDENT CREATE ERROR:", createError);

      return NextResponse.json(
        { error: createError?.message || "Could not create student." },
        { status: 400 }
      );
    }

    // Insert student profile
    const { error: insertError } = await adminClient
      .from("profiles")
      .insert({
        id: newUser.user.id,
        full_name,
        role: "student",
      });

    if (insertError) {
      console.error("PROFILE INSERT ERROR:", insertError);

      await adminClient.auth.admin.deleteUser(newUser.user.id);

      return NextResponse.json(
        { error: insertError.message },
        { status: 400 }
      );
    }

    console.log("STUDENT CREATED:", newUser.user.id);

    return NextResponse.json({
      success: true,
      message: "Student account created successfully!",
    });

  } catch (error) {
    console.error("CREATE STUDENT ERROR:", error);

    return NextResponse.json(
      { error: "Something went wrong. Please check the VS Code Terminal." },
      { status: 500 }
    );
  }
}

