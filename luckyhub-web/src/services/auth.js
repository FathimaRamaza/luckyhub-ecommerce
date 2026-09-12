import {
  supabase,
  supabaseConfigured,
} from './supabase'

export async function loginStaff(email, password) {
  if (!supabaseConfigured || !supabase) {
    return {
      success: false,
      message:
        'Supabase is not configured. Please check your .env file.',
    }
  }

  try {
    const {
      data,
      error,
    } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return {
        success: false,
        message:
          'Incorrect email or password.',
      }
    }

    if (!data?.user) {
      return {
        success: false,
        message:
          'Unable to sign in.',
      }
    }

    const {
      data: staff,
      error: staffError,
    } = await supabase
      .from('staff_users')
      .select(
        'id, user_id, name, role, is_active'
      )
      .eq('user_id', data.user.id)
      .maybeSingle()

    if (staffError) {
      console.error(
        'Staff verification error:',
        staffError
      )

      await supabase.auth.signOut()

      return {
        success: false,
        message:
          'Unable to verify staff access.',
      }
    }

    if (!staff) {
      await supabase.auth.signOut()

      return {
        success: false,
        message:
          'This account is not authorized to access the Lucky Hub management system.',
      }
    }

    if (!staff.is_active) {
      await supabase.auth.signOut()

      return {
        success: false,
        message:
          'This staff account has been disabled.',
      }
    }

    if (
      staff.role !== 'admin' &&
      staff.role !== 'shopkeeper'
    ) {
      await supabase.auth.signOut()

      return {
        success: false,
        message:
          'You do not have permission to access this system.',
      }
    }

    return {
      success: true,
      user: data.user,
      staff,
    }
  } catch (error) {
    console.error(error)

    return {
      success: false,
      message:
        'Something went wrong while signing in.',
    }
  }
}

export async function getCurrentStaff() {
  if (!supabaseConfigured || !supabase) {
    return null
  }

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.user) {
      return null
    }

    const {
      data: staff,
      error,
    } = await supabase
      .from('staff_users')
      .select(
        'id, user_id, name, role, is_active'
      )
      .eq(
        'user_id',
        session.user.id
      )
      .maybeSingle()

    if (
      error ||
      !staff ||
      !staff.is_active
    ) {
      return null
    }

    if (
      staff.role !== 'admin' &&
      staff.role !== 'shopkeeper'
    ) {
      return null
    }

    return {
      user: session.user,
      staff,
    }
  } catch (error) {
    console.error(error)
    return null
  }
}

export async function logoutStaff() {
  if (!supabase) {
    return
  }

  await supabase.auth.signOut()
}