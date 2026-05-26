(function () {
  var current = window.AGENT_OPS_SUPABASE || {};
  window.AGENT_OPS_SUPABASE = {
    url: current.url || "__SUPABASE_URL__",
    publishableKey: current.publishableKey || "__SUPABASE_PUBLISHABLE_KEY__"
  };
}());
