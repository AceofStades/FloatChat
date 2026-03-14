import xarray as xr

# 1. Load your dataset
input_file = "temp_data_0.nc"
ds = xr.open_dataset(input_file)

print(f"Original dimensions: {ds.dims}")

# Fallback: start by assuming we aren't slicing anything
ds_sliced = ds

# ---------------------------------------------------------
# OPTION A: Shave off the end of the time dimension
# Updated to use 'valid_time' based on your dataset
# ---------------------------------------------------------
if "valid_time" in ds.dims:
    total_time_steps = ds.sizes["valid_time"]
    keep_amount = int(total_time_steps * 0.3)  # keep roughly 30% of the data
    ds_sliced = ds.isel(valid_time=slice(0, keep_amount))
    print(f"Sliced valid_time from {total_time_steps} down to {keep_amount} steps.")

# ---------------------------------------------------------
# OPTION B & C: Left out for now, but you can add them back
# if slicing valid_time doesn't shrink it enough!
# ---------------------------------------------------------

# 2. Save the new dataset with compression
output_file = "smaller_dataset.nc"

# Apply a standard zlib compression level (4 is a good balance of speed/size)
encoding_dict = {var: {"zlib": True, "complevel": 4} for var in ds_sliced.data_vars}

ds_sliced.to_netcdf(output_file, encoding=encoding_dict)

print(f"Successfully saved shaved dataset to {output_file}")
