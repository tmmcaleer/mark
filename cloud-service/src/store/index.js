const { createClient } = require("@supabase/supabase-js");

const { MemoryStore } = require("./memory-store");
const { SupabaseStore } = require("./supabase-store");

function createStore(config, options = {}) {
  if (options.store) {
    return options.store;
  }

  if (config.supabaseUrl && config.supabaseSecretKey) {
    const supabase = options.supabase || createClient(config.supabaseUrl, config.supabaseSecretKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
    return new SupabaseStore(supabase);
  }

  return new MemoryStore();
}

function createSupabaseAuthClient(config, options = {}) {
  if (options.supabaseAuth) {
    return options.supabaseAuth;
  }
  if (!config.supabaseUrl || !config.supabaseSecretKey) {
    return null;
  }
  return createClient(config.supabaseUrl, config.supabaseSecretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

module.exports = {
  createStore,
  createSupabaseAuthClient
};
