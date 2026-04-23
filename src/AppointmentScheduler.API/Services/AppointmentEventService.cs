using System.Collections.Concurrent;
using System.Threading.Channels;

namespace AppointmentScheduler.API.Services;

/// <summary>
/// Singleton in-memory pub/sub broker for real-time appointment events.
/// Each connected browser tab gets its own Channel. When an appointment changes,
/// all channels subscribed to that businessId receive an event name string that
/// the SSE controller forwards as a Server-Sent Event.
/// </summary>
public sealed class AppointmentEventService
{
    // businessId → (subscriptionId → channel)
    private readonly ConcurrentDictionary<Guid, ConcurrentDictionary<Guid, Channel<string>>> _subs = new();

    public (Guid SubscriptionId, ChannelReader<string> Reader) Subscribe(Guid businessId)
    {
        var subId = Guid.NewGuid();
        var channel = Channel.CreateBounded<string>(new BoundedChannelOptions(32)
        {
            FullMode = BoundedChannelFullMode.DropOldest,
            SingleReader = true
        });
        _subs.GetOrAdd(businessId, _ => new()).TryAdd(subId, channel);
        return (subId, channel.Reader);
    }

    public void Unsubscribe(Guid businessId, Guid subscriptionId)
    {
        if (_subs.TryGetValue(businessId, out var biz))
        {
            biz.TryRemove(subscriptionId, out var ch);
            ch?.Writer.TryComplete();
            if (biz.IsEmpty) _subs.TryRemove(businessId, out _);
        }
    }

    /// <summary>Push an event to every tab watching this business.</summary>
    public void Notify(Guid businessId, string eventName = "appointment_changed")
    {
        if (!_subs.TryGetValue(businessId, out var biz)) return;
        foreach (var (_, ch) in biz)
            ch.Writer.TryWrite(eventName);
    }
}
