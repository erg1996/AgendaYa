FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY AppointmentScheduler.sln ./
COPY src/AppointmentScheduler.API/AppointmentScheduler.API.csproj src/AppointmentScheduler.API/
COPY src/AppointmentScheduler.Application/AppointmentScheduler.Application.csproj src/AppointmentScheduler.Application/
COPY src/AppointmentScheduler.Domain/AppointmentScheduler.Domain.csproj src/AppointmentScheduler.Domain/
COPY src/AppointmentScheduler.Infrastructure/AppointmentScheduler.Infrastructure.csproj src/AppointmentScheduler.Infrastructure/
RUN dotnet restore src/AppointmentScheduler.API/AppointmentScheduler.API.csproj

COPY src/ src/
RUN dotnet publish src/AppointmentScheduler.API/AppointmentScheduler.API.csproj \
    -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd -r app && useradd -r -g app app \
    && mkdir -p /app/data /app/wwwroot/uploads /app/logs \
    && chown -R app:app /app

COPY --from=build --chown=app:app /app/publish .

USER app
ENV ASPNETCORE_ENVIRONMENT=Production \
    ASPNETCORE_URLS=http://+:8080 \
    DOTNET_RUNNING_IN_CONTAINER=true

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -fs http://localhost:8080/health || exit 1

ENTRYPOINT ["dotnet", "AppointmentScheduler.API.dll"]
