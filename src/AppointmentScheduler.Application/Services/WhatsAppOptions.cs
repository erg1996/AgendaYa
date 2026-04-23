namespace AppointmentScheduler.Application.Services;

public class WhatsAppOptions
{
    public string ServiceUrl { get; set; } = "";
    public string InternalSecret { get; set; } = "";
}

public class FeatureFlags
{
    public bool WhatsAppAutomation { get; set; } = false;
}
