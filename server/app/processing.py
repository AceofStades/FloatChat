import pandas as pd
import xarray as xr


def get_schema_from_dataframe(df: pd.DataFrame) -> str:
    """Extracts a readable schema from a Pandas DataFrame for the LLM."""
    # This is a common way to capture the output of df.info()
    import io

    buffer = io.StringIO()
    df.info(buf=buffer)
    return buffer.getvalue()


def nc_to_dataframe(ds: xr.Dataset) -> pd.DataFrame:
    """
    Converts any NetCDF xarray dataset into a flattened Pandas DataFrame.
    """
    # Drop any dimensions that have a size of 0 to prevent empty cartesian products
    for dim in list(ds.dims):
        if ds.sizes[dim] == 0:
            ds = ds.drop_dims(dim)

    # This robustly converts the dataset to a dataframe, making columns from coordinates.
    df = ds.to_dataframe().reset_index()
    return df
