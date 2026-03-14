import folium
import pandas as pd
import plotly.express as px
import plotly.io as pio


def map_html(df: pd.DataFrame):
    """Generates an HTML map of filtered float locations using Folium."""
    if df.empty:
        return "<h3>No data available to display on map.</h3>"

    unique_locations = df.drop_duplicates(subset=["latitude", "longitude"])
    if unique_locations.empty:
        return "<h3>No unique locations to display on map.</h3>"

    center_lat = unique_locations["latitude"].mean()
    center_lon = unique_locations["longitude"].mean()
    m = folium.Map(location=[center_lat, center_lon], zoom_start=3)

    for _, row in unique_locations.iterrows():
        popup_text = f"Lat: {row['latitude']:.2f}, Lon: {row['longitude']:.2f}"
        folium.CircleMarker(
            [row["latitude"], row["longitude"]],
            radius=5,
            color="blue",
            fill=True,
            fill_color="blue",
            popup=popup_text,
        ).add_to(m)

    raw_html = m.get_root().render()
    import html

    escaped_html = html.escape(raw_html)
    iframe_html = f'<iframe srcdoc="{escaped_html}" style="width: 100%; aspect-ratio: 16/9; min-height: 400px; border: none; border-radius: 8px; background: transparent; overflow: hidden;" scrolling="no"></iframe>'
    return iframe_html


def generate_chart_html(df: pd.DataFrame, title: str = "Data Visualization") -> str:
    """Generates an interactive Plotly chart as HTML."""
    if df.empty:
        return "<h3>No data available for charting.</h3>"

    cols = df.columns.tolist()

    # Try to find logical x and y axes
    x_col = None
    y_col = None

    # Common time/sequence columns
    for col in ["valid_time", "time", "date", "number", "index"]:
        if col in cols:
            x_col = col
            break

    # If no time column, use the first non-numeric or just the first column
    if not x_col:
        x_col = cols[0]

    # Find a numeric column for Y axis (excluding lat/lon if possible unless specifically requested)
    numeric_cols = df.select_dtypes(include="number").columns.tolist()
    y_cols = [
        c
        for c in numeric_cols
        if c != x_col and c not in ["latitude", "longitude", "id"]
    ]

    if not y_cols:
        if numeric_cols:
            y_col = numeric_cols[0]
        else:
            return "<h3>Data doesn't contain numeric values for plotting.</h3>"
    else:
        y_col = y_cols[0]  # Just pick the first numeric one for a simple auto-plot

    try:
        # Create a line chart if x seems sequential, otherwise scatter or bar
        fig = px.line(df, x=x_col, y=y_col, title=f"{y_col} vs {x_col}")
        fig.update_layout(
            template="plotly_dark",
            paper_bgcolor="rgba(0,0,0,0)",
            plot_bgcolor="rgba(0,0,0,0)",
            margin=dict(l=20, r=20, t=40, b=20),
            autosize=True,
        )

        raw_html = pio.to_html(fig, full_html=True, include_plotlyjs="cdn")
        import html

        escaped_html = html.escape(raw_html)
        iframe_html = f'<iframe srcdoc="{escaped_html}" style="width: 100%; aspect-ratio: 16/9; min-height: 400px; border: none; border-radius: 8px; background: transparent; overflow: hidden;" scrolling="no"></iframe>'
        return iframe_html
    except Exception as e:
        return f"<h3>Error generating chart: {e}</h3>"
